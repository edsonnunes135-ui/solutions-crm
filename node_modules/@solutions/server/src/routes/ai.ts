import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import Anthropic from "@anthropic-ai/sdk";

export const aiRouter = Router();
aiRouter.use(requireAuth);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SummarizeSchema = z.object({
  context: z.string().min(1),
  goal: z.string().optional(),
});

aiRouter.post("/ai/summarize", async (req: AuthedRequest, res) => {
  const parsed = SummarizeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const { context, goal } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({
      summary: "Resumo (stub): Lead pediu info, está qualificado e precisa de resposta com prazo + condições + CTA.",
      nextBestAction: "Responder em até 5 min com proposta objetiva e agendar call.",
      suggestedReply: "Perfeito! Consigo entregar em X dias. Posso te mandar a proposta agora e alinhamos em 10 min por ligação?",
      note: "Configure ANTHROPIC_API_KEY no .env para respostas reais.",
    });
  }

  const systemPrompt = `Você é um copiloto de vendas especializado em CRM conversacional.
Analise o contexto fornecido e responda SEMPRE em JSON com exatamente estas chaves:
{
  "summary": "resumo objetivo da situação do lead em 1-2 frases",
  "nextBestAction": "próxima ação recomendada em 1 frase",
  "suggestedReply": "mensagem sugerida para enviar ao lead (tom conversacional, direto)"
}`;

  const userMessage = `Contexto do CRM:\n${context}\n\nObjetivo do vendedor: ${goal ?? "Resumir situação e sugerir próxima ação"}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { summary: text, nextBestAction: "", suggestedReply: "" };
    }

    res.json({
      summary: parsed.summary ?? "",
      nextBestAction: parsed.nextBestAction ?? "",
      suggestedReply: parsed.suggestedReply ?? "",
    });
  } catch (err: any) {
    res.status(500).json({ error: "ai_error", message: err.message });
  }
});
