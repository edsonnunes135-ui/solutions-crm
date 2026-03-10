import { Router } from "express";
import { prisma } from "../lib/prisma";
import { enqueueEvent } from "../lib/queue";
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
  }

  return res.status(200).json({ ok: true, orgId, channel: normalized.channel, ingested });
});
