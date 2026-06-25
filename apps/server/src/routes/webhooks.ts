import { Router } from "express";
import { prisma } from "../lib/prisma";
import { enqueueEvent } from "../lib/queue";
import { pushToOrg } from "../lib/push";
import { aiEnabled, agentReply, scoreLead } from "../lib/ai";
import { sendChannelMessage } from "../lib/send";
import { runMatchingFlow } from "../lib/flows";
import { autoAssignIfNeeded } from "../lib/assign";
import { planForOrg } from "./billing";
import {
  normalizeMetaWebhook,
  resolveOrgIdForMetaWebhook,
  findOrCreateContactByIdentity,
  upsertConversationForContact,
  insertInboundMessageIfNew,
} from "../lib/meta";

/**
 * Webhooks (Meta) — Normalizado (v4)
 * - GET: verificação (hub.challenge)
 * - POST: normaliza payloads WhatsApp/Instagram -> Contact/Conversation/Message
 *         e cria Events (message_received) para automações.
 *
 * Multi-tenant:
 * - Produção: configure /channels/accounts com o phone_number_id (WhatsApp) e o recipient/IG id (Instagram)
 * - DEV: pode enviar header x-org-id
 */
export const webhooksRouter = Router();

webhooksRouter.get("/webhooks/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === (process.env.WEBHOOK_VERIFY_TOKEN || "solutions_verify")) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

webhooksRouter.post("/webhooks/meta", async (req, res) => {
  const normalized = normalizeMetaWebhook(req.body);
  const headerOrgId = req.headers["x-org-id"]?.toString() || null;

  const orgId = await resolveOrgIdForMetaWebhook({
    channel: normalized.channel,
    externalAccountId: normalized.externalAccountId,
    headerOrgId,
  });

  if (!orgId) {
    return res.status(400).json({
      error: "unknown_org",
      hint: "Cadastre /channels/accounts (phone_number_id / recipient id) ou envie header x-org-id (DEV).",
    });
  }

  // salva raw para auditoria (não enfileira)
  await prisma.event.create({
    data: { orgId, type: "meta_webhook_raw", payload: req.body, processed: true },
  });

  let ingested = 0;
  for (const m of normalized.messages) {
    // 1) contato por identidade
    const contact = await findOrCreateContactByIdentity({
      orgId,
      channel: m.channel,
      senderExternalId: m.senderExternalId,
      senderName: m.senderName,
    });

    // 2) conversa por contato+canal (externalId = senderExternalId)
    const conv = await upsertConversationForContact({
      orgId,
      contactId: contact.id,
      channel: m.channel,
      conversationExternalId: m.senderExternalId,
    });

    // 3) mensagem (dedupe por externalId)
    const inserted = await insertInboundMessageIfNew({
      orgId,
      conversationId: conv.id,
      channel: m.channel,
      externalId: m.messageExternalId,
      text: m.text,
    });

    if (!inserted.created || !inserted.message) continue;

    // 4) event para automações
    const ev = await prisma.event.create({
      data: {
        orgId,
        type: "message_received",
        payload: {
          contactId: contact.id,
          conversationId: conv.id,
          messageId: inserted.message.id,
          channel: m.channel,
          text: m.text,
          externalMessageId: m.messageExternalId,
        },
      },
    });

    await enqueueEvent(ev.id);
    ingested++;

    // Notificação push para a equipe
    pushToOrg(orgId, {
      title: `Nova mensagem de ${contact.name}`,
      body: m.text?.slice(0, 120) ?? "Você recebeu uma mensagem",
      url: "/",
    }).catch(() => {});

    // Fila de atendimento: distribui a conversa automaticamente se ainda não tem dono.
    await autoAssignIfNeeded(orgId, conv.id);

    // Fluxos no-code (determinístico — funciona SEM a chave da IA).
    // Se um fluxo casar com a mensagem e responder, ele tem prioridade sobre o agente.
    let flowFired = false;
    try {
      const inboundCount = await prisma.message.count({ where: { orgId, conversationId: conv.id, direction: "inbound" } });
      flowFired = await runMatchingFlow({
        orgId,
        conversationId: conv.id,
        contactId: contact.id,
        contactName: contact.name,
        channel: m.channel,
        text: m.text ?? "",
        isFirstInbound: inboundCount <= 1,
      });
    } catch {
      // fluxos são best-effort; nunca quebram o webhook
    }

    // IA: pontuação automática do lead + agente autônomo (se ativados e plano permite)
    try {
      const plan = await planForOrg(orgId);
      if (aiEnabled() && plan.ai) {
        const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
        const history = await prisma.message.findMany({
          where: { orgId, conversationId: conv.id },
          orderBy: { sentAt: "asc" },
          take: 30,
          select: { direction: true, text: true },
        });

        // 1) pontua o lead automaticamente (alimenta "Leads quentes para atacar hoje")
        try {
          const s = await scoreLead({
            messages: history,
            contactName: contact.name,
            company: (contact as any).company ?? undefined,
            tags: (contact as any).tags ?? [],
          });
          if (s.score != null) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { aiScore: s.score, aiTemperature: s.temperature, aiScoreReason: s.reason },
            });
          }
        } catch {
          /* score é best-effort */
        }

        // 2) agente autônomo responde — só se ativado e nenhum humano assumiu a conversa
        const humanHandling = !!(conv as any).assigneeId || ((conv as any).status && (conv as any).status !== "open");
        if (setting?.aiAutoReply && !humanHandling && !flowFired) {
          const a = await agentReply({
            messages: history,
            contactName: contact.name,
            company: (contact as any).company ?? undefined,
            brandName: setting.brandName ?? undefined,
          });
          if (a.reply) {
            await sendChannelMessage({ orgId, conversationId: conv.id, channel: m.channel, text: a.reply });
          }
          if (a.handoff) {
            pushToOrg(orgId, {
              title: `🔥 ${contact.name} precisa de atendimento humano`,
              body: a.handoffReason || "O agente de IA pediu para passar a conversa para uma pessoa.",
              url: "/",
            }).catch(() => {});
          }
        }
      }
    } catch {
      // IA é best-effort; nunca quebra o webhook
    }
  }

  return res.status(200).json({ ok: true, orgId, channel: normalized.channel, ingested });
});
