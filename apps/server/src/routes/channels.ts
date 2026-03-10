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
  const deleted = await prisma.channelAccount.deleteMany({ where: { id, orgId } });
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

  // cria mensagem outbound local (stub)
  const msg = await prisma.message.create({
    data: {
      orgId,
      conversationId: parsed.data.conversationId,
      channel: parsed.data.channel,
      direction: "outbound",
      text: parsed.data.text,
    },
  });

  // TODO: enviar para canal real e salvar externalId, status etc.
  res.json({ ok: true, message: msg, sent: false, note: "stub: plugue a API do canal" });
});
