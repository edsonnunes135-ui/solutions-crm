import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { aiEnabled, suggestReply, summarizeConversation, copilotAnswer, scoreLead } from "../lib/ai";
import { planForOrg } from "./billing";

/**
 * IA do Solutions — powered by Claude (Anthropic).
 * Funciona em modo stub sem ANTHROPIC_API_KEY; fica inteligente ao configurá-la.
 */
export const aiRouter = Router();
aiRouter.use(requireAuth);

/** Gate: recursos de IA só nos planos com ai=true (Pro/Business e trial). */
async function requireAiPlan(req: AuthedRequest, res: any, next: any) {
  const plan = await planForOrg(req.user!.orgId);
  if (!plan.ai) {
    return res.status(402).json({ error: "plan_upgrade_required", resource: "ai", note: "Os recursos de IA estão disponíveis nos planos Pro e Business. Faça upgrade para usar a IA." });
  }
  next();
}

aiRouter.get("/ai/status", async (req: AuthedRequest, res) => {
  const plan = await planForOrg(req.user!.orgId);
  res.json({ enabled: aiEnabled() && plan.ai, configured: aiEnabled(), planAllows: plan.ai });
});

async function loadContactMessages(orgId: string, contactId: string) {
  const conversations = await prisma.conversation.findMany({ where: { orgId, contactId }, select: { id: true } });
  return prisma.message.findMany({
    where: { orgId, conversationId: { in: conversations.map((c) => c.id) } },
    orderBy: { sentAt: "asc" },
    take: 50,
    select: { direction: true, text: true },
  });
}

// Sugerir resposta para um contato
const ContactBody = z.object({ contactId: z.string().min(1) });
aiRouter.post("/ai/suggest-reply", requireAiPlan, async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, orgId } });
  if (!contact) return res.status(404).json({ error: "not_found" });
  const messages = await loadContactMessages(orgId, contact.id);
  try {
    res.json(await suggestReply({ messages, contactName: contact.name, company: contact.company ?? undefined }));
  } catch (err: any) {
    res.status(502).json({ error: "ai_error", detail: String(err?.message ?? err) });
  }
});

// Resumir conversa
aiRouter.post("/ai/summarize", requireAiPlan, async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, orgId } });
  if (!contact) return res.status(404).json({ error: "not_found" });
  const messages = await loadContactMessages(orgId, contact.id);
  try {
    res.json(await summarizeConversation({ messages, contactName: contact.name }));
  } catch (err: any) {
    res.status(502).json({ error: "ai_error", detail: String(err?.message ?? err) });
  }
});

// Copiloto (pergunta livre, com contexto opcional do contato)
const AskBody = z.object({ prompt: z.string().min(1), contactId: z.string().optional() });
aiRouter.post("/ai/ask", requireAiPlan, async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = AskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  let context: string | undefined;
  if (parsed.data.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, orgId } });
    if (contact) {
      const messages = await loadContactMessages(orgId, contact.id);
      context = `Contato: ${contact.name}\n` + messages.map((m) => `${m.direction === "outbound" ? "Empresa" : "Cliente"}: ${m.text}`).join("\n");
    }
  }
  try {
    res.json(await copilotAnswer({ prompt: parsed.data.prompt, context }));
  } catch (err: any) {
    res.status(502).json({ error: "ai_error", detail: String(err?.message ?? err) });
  }
});

// Analisar lead (score) — persiste no contato
aiRouter.post("/ai/score-lead", requireAiPlan, async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const contact = await prisma.contact.findFirst({ where: { id: parsed.data.contactId, orgId }, include: { tags: { include: { tag: true } } } });
  if (!contact) return res.status(404).json({ error: "not_found" });
  const messages = await loadContactMessages(orgId, contact.id);
  try {
    const r = await scoreLead({
      messages,
      contactName: contact.name,
      company: contact.company ?? undefined,
      tags: contact.tags.map((t) => t.tag.name),
    });
    if (r.score !== null) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { aiScore: r.score, aiTemperature: r.temperature, aiScoreReason: r.reason },
      });
    }
    res.json(r);
  } catch (err: any) {
    res.status(502).json({ error: "ai_error", detail: String(err?.message ?? err) });
  }
});
