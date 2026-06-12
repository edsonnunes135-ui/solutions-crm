import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { sendChannelMessage } from "../lib/send";

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

  const r = await sendChannelMessage({
    orgId,
    conversationId: parsed.data.conversationId,
    channel: parsed.data.channel,
    text: parsed.data.text,
  });

  if (r.error === "conversation_not_found") return res.status(404).json({ error: r.error });

  const noteMap: Record<string, string> = {
    whatsapp_not_configured: "configure o WhatsApp em Configurações",
    instagram_not_configured: "configure o Instagram em Configurações",
    no_external_identity: "conversa sem identidade externa (contato precisa ter mandado mensagem antes)",
  };

  res.json({
    ok: !r.error,
    sent: r.sent,
    externalId: r.externalId ?? null,
    note: r.note ? noteMap[r.note] ?? r.note : r.error,
    messageId: r.messageId,
  });
});
