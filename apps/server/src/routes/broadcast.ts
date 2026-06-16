import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { sendChannelMessage } from "../lib/send";
import { PLANS } from "./billing";

export const broadcastRouter = Router();
broadcastRouter.use(requireAuth);

const BroadcastBody = z.object({
  text: z.string().min(1).max(2000),
  tag: z.string().optional(), // sem tag = todos os contatos com conversa ativa
  temperature: z.enum(["quente", "morno", "frio"]).optional(), // segmentar por score da IA
  channel: z.enum(["whatsapp", "instagram"]).default("whatsapp"),
});

/**
 * Personaliza a mensagem por contato:
 * - Variáveis: {nome}, {primeiro_nome}, {empresa}
 * - Spintax (variação anti-bloqueio): {Oi|Olá|Bom dia} → escolhe uma opção ao acaso
 */
function personalize(text: string, c: { name?: string | null; company?: string | null }): string {
  // spintax primeiro (qualquer chave que contenha "|")
  let out = text.replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, grp: string) => {
    const opts = grp.split("|").map((s) => s.trim()).filter(Boolean);
    return opts.length ? opts[Math.floor(Math.random() * opts.length)] : "";
  });
  const full = (c.name ?? "").trim();
  const first = full.split(/\s+/)[0] ?? "";
  out = out
    .replace(/\{primeiro_nome\}/gi, first)
    .replace(/\{nome\}/gi, full)
    .replace(/\{empresa\}/gi, (c.company ?? "").trim());
  return out;
}

/**
 * Campanha em massa: envia a mensagem para todos os contatos (filtrados por tag)
 * que possuem conversa ativa no canal. Restrito a gestão e a planos com broadcast.
 */
broadcastRouter.post("/broadcasts", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = BroadcastBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const plan = PLANS[org?.plan ?? "trial"] ?? PLANS.trial;
  if (!plan.broadcast) {
    return res.status(402).json({ error: "plan_upgrade_required", note: "Campanhas em massa disponíveis nos planos Pro e Business." });
  }

  const { text, tag, temperature, channel } = parsed.data;

  const contacts = await prisma.contact.findMany({
    where: {
      orgId,
      conversationDeletedAt: null,
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
      ...(temperature ? { aiTemperature: temperature } : {}),
    },
    include: {
      conversations: {
        where: { channel, status: { not: "deleted" }, externalId: { not: null } },
        orderBy: { lastAt: "desc" },
        take: 1,
      },
    },
    take: 500,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    const conv = c.conversations[0];
    if (!conv) { skipped++; continue; }
    const personalized = personalize(text, c);
    const r = await sendChannelMessage({ orgId, conversationId: conv.id, channel, text: personalized });
    if (r.sent) sent++;
    else {
      failed++;
      if (r.error && errors.length < 5) errors.push(`${c.name}: ${r.error}`);
      if (r.note && errors.length < 5) errors.push(`${c.name}: ${r.note}`);
    }
  }

  // registra a campanha para histórico/auditoria
  await prisma.event.create({
    data: {
      orgId,
      type: "broadcast_sent",
      processed: true,
      payload: { text: text.slice(0, 500), tag: tag ?? null, temperature: temperature ?? null, channel, sent, failed, skipped, total: contacts.length },
    },
  });

  res.json({ ok: true, total: contacts.length, sent, failed, skipped, errors });
});

// histórico de campanhas
broadcastRouter.get("/broadcasts", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const events = await prisma.event.findMany({
    where: { orgId, type: "broadcast_sent" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(events.map((e) => ({ id: e.id, createdAt: e.createdAt, ...(e.payload as any) })));
});
