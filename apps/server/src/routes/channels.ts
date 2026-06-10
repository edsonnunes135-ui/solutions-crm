import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

/**
 * Endpoints de envio (stub).
 * No produto real:
 * - WhatsApp: POST para endpoint oficial com access token
 * - Instagram: endpoint oficial de mensagens
 */
export const channelsRouter = Router();
channelsRouter.use(requireAuth);

/**
 * Contas conectadas (multi-tenant mapping)
 * - WhatsApp: externalAccountId = phone_number_id
 * - Instagram: externalAccountId = recipient/page/ig id
 */

const AccountSchema = z.object({
  channel: z.enum(["whatsapp", "instagram"]),
  externalAccountId: z.string().min(3),
  displayName: z.string().optional(),
});

channelsRouter.get("/channels/accounts", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const accounts = await prisma.channelAccount.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ ok: true, accounts });
});

channelsRouter.post("/channels/accounts", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = AccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const acc = await prisma.channelAccount.upsert({
    where: { orgId_channel_externalAccountId: { orgId, channel: parsed.data.channel, externalAccountId: parsed.data.externalAccountId } } as any,
    update: { displayName: parsed.data.displayName ?? null },
    create: { orgId, channel: parsed.data.channel, externalAccountId: parsed.data.externalAccountId, displayName: parsed.data.displayName ?? null },
  });

  res.json({ ok: true, account: acc });
});

channelsRouter.delete("/channels/accounts/:id", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const id = req.params.id;
  const deleted = await prisma.channelAccount.deleteMany({ where: { id: String(id), orgId } });
  res.json({ ok: true, deleted: deleted.count });
});

const SendSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1),
  channel: z.enum(["whatsapp", "instagram"]),
});

channelsRouter.post("/channels/send", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const conv = await prisma.conversation.findFirst({
    where: { id: parsed.data.conversationId, orgId },
  });
  if (!conv) return res.status(404).json({ error: "conversation_not_found" });

  // registra a mensagem outbound localmente
  const msg = await prisma.message.create({
    data: {
      orgId,
      conversationId: conv.id,
      channel: parsed.data.channel,
      direction: "outbound",
      text: parsed.data.text,
    },
  });

  // envio real via WhatsApp Cloud API (Meta)
  if (parsed.data.channel === "whatsapp") {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const recipient = conv.externalId; // wa id do contato (vem do webhook)

    if (!token || !phoneNumberId) {
      return res.json({ ok: true, message: msg, sent: false, note: "configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID" });
    }
    if (!recipient) {
      return res.json({ ok: true, message: msg, sent: false, note: "conversa sem identidade externa (contato precisa ter mandado mensagem antes)" });
    }

    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body: parsed.data.text },
        }),
      });
      const data: any = await r.json();
      if (!r.ok) {
        return res.status(502).json({ ok: false, message: msg, sent: false, error: data?.error?.message ?? "meta_error" });
      }
      const externalId = data?.messages?.[0]?.id ?? null;
      if (externalId) {
        await prisma.message.update({ where: { id: msg.id }, data: { externalId } });
      }
      return res.json({ ok: true, message: msg, sent: true, externalId });
    } catch (err: any) {
      return res.status(502).json({ ok: false, message: msg, sent: false, error: err.message });
    }
  }

  // Instagram: ainda não implementado
  res.json({ ok: true, message: msg, sent: false, note: "instagram: em breve" });
});
