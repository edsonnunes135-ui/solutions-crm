import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { enqueueEvent } from "../lib/queue";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const devRouter = Router();
devRouter.use(requireAuth);

/**
 * DEV: Simular uma mensagem inbound (para testar automações sem Meta)
 * POST /dev/mock-message
 * body: { contactName, company?, channel, text }
 */
const MockSchema = z.object({
  contactName: z.string().min(1),
  company: z.string().optional(),
  channel: z.enum(["whatsapp", "instagram"]),
  text: z.string().min(1),
});

devRouter.post("/dev/mock-message", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = MockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });

  // upsert contact by name+company for MVP simplicity
  const contact = await prisma.contact.create({
    data: { orgId, name: parsed.data.contactName, company: parsed.data.company ?? null },
  });

  const conv = await prisma.conversation.create({
    data: { orgId, contactId: contact.id, channel: parsed.data.channel, status: "open" },
  });

  const msg = await prisma.message.create({
    data: {
      orgId,
      conversationId: conv.id,
      channel: parsed.data.channel,
      direction: "inbound",
      text: parsed.data.text,
    },
  });

  const ev = await prisma.event.create({
    data: {
      orgId,
      type: "message_received",
      payload: { contactId: contact.id, conversationId: conv.id, messageId: msg.id, channel: parsed.data.channel, text: parsed.data.text },
    },
  });

  await enqueueEvent(ev.id);
  res.json({ ok: true, contact, conversation: conv, message: msg, eventId: ev.id });
});
