import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";

/**
 * IA (stub).
 * - Você pode plugar OpenAI/LLM aqui.
 * - Sugestão: RAG com histórico + playbooks + campos do CRM
 */
export const aiRouter = Router();
aiRouter.use(requireAuth);

const SummarizeSchema = z.object({
  context: z.string().min(1),
  goal: z.string().optional(),
});

aiRouter.post("/ai/summarize", async (req: AuthedRequest, res) => {
  const parsed = SummarizeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  // stub output
  res.json({
    summary: "Resumo (stub): Lead pediu info, está qualificado e precisa de resposta com prazo + condições + CTA.",
    nextBestAction: "Responder em até 5 min com proposta objetiva e agendar call.",
    suggestedReply: "Perfeito! Consigo entregar em X dias. Posso te mandar a proposta agora e alinhamos em 10 min por ligação?",
    promptUsed: parsed.data,
  });
});
