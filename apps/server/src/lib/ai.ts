import Anthropic from "@anthropic-ai/sdk";

/**
 * Camada de IA do Solutions, powered by Claude (Anthropic).
 * Todas as funções degradam graciosamente para um modo "stub" quando
 * ANTHROPIC_API_KEY não está configurada — assim o app funciona sem a chave,
 * e fica inteligente assim que o dono a adiciona nas variáveis de ambiente.
 */

const MODEL = "claude-opus-4-8";

export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function client() {
  return new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente
}

type ChatMsg = { direction: string; text: string };

function transcript(messages: ChatMsg[], max = 30): string {
  return messages
    .slice(-max)
    .map((m) => `${m.direction === "outbound" ? "Empresa" : "Cliente"}: ${m.text}`)
    .join("\n");
}

/** Sugere uma resposta ao cliente com base no histórico da conversa. */
export async function suggestReply(params: { messages: ChatMsg[]; contactName?: string; company?: string }) {
  if (!aiEnabled()) {
    return { text: "", note: "ai_not_configured" };
  }
  const r = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system:
      "Você é um assistente de vendas brasileiro, cordial e objetivo. Escreva uma resposta curta (no máximo 3 frases) para o cliente via WhatsApp, em português do Brasil, tom profissional e caloroso. Não invente preços ou prazos específicos que não estejam no histórico. Responda apenas com a mensagem, sem aspas nem rótulos.",
    messages: [
      {
        role: "user",
        content: `Contato: ${params.contactName ?? "Cliente"}${params.company ? ` (${params.company})` : ""}\n\nHistórico da conversa:\n${transcript(params.messages)}\n\nEscreva a próxima resposta da empresa para este cliente.`,
      },
    ],
  });
  const text = r.content.find((b) => b.type === "text");
  return { text: text && "text" in text ? text.text.trim() : "" };
}

/** Resume a conversa e sugere a próxima melhor ação. */
export async function summarizeConversation(params: { messages: ChatMsg[]; contactName?: string }) {
  if (!aiEnabled()) {
    return {
      summary: "IA não configurada. Adicione ANTHROPIC_API_KEY nas configurações do servidor para ativar resumos automáticos.",
      nextBestAction: "",
      note: "ai_not_configured",
    };
  }
  const r = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system:
      "Você é um copiloto de vendas. Resuma a conversa em 2-3 frases e indique a próxima melhor ação. Responda em português do Brasil.",
    messages: [
      {
        role: "user",
        content: `Conversa com ${params.contactName ?? "o cliente"}:\n${transcript(params.messages)}\n\nFormato da resposta:\nRESUMO: ...\nPRÓXIMA AÇÃO: ...`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === "text");
  const full = block && "text" in block ? block.text : "";
  const summary = (full.match(/RESUMO:\s*([\s\S]*?)(?:PRÓXIMA AÇÃO:|$)/i)?.[1] ?? full).trim();
  const nextBestAction = (full.match(/PRÓXIMA AÇÃO:\s*([\s\S]*)/i)?.[1] ?? "").trim();
  return { summary, nextBestAction };
}

/** Pergunta livre do copiloto, com contexto opcional do CRM. */
export async function copilotAnswer(params: { prompt: string; context?: string }) {
  if (!aiEnabled()) {
    return { answer: "IA não configurada. Adicione ANTHROPIC_API_KEY nas configurações do servidor para ativar o copiloto.", note: "ai_not_configured" };
  }
  const r = await client().messages.create({
    model: MODEL,
    max_tokens: 1200,
    system:
      "Você é o copiloto de vendas do Solutions CRM. Ajude o vendedor com mensagens, estratégias de negociação, objeções e organização do funil. Seja prático e direto, em português do Brasil.",
    messages: [
      { role: "user", content: params.context ? `Contexto do CRM:\n${params.context}\n\nPergunta: ${params.prompt}` : params.prompt },
    ],
  });
  const block = r.content.find((b) => b.type === "text");
  return { answer: block && "text" in block ? block.text.trim() : "" };
}

/** Analisa a conversa do contato e devolve um score de 0-100 + temperatura + motivo. */
export async function scoreLead(params: { messages: ChatMsg[]; contactName?: string; company?: string; tags?: string[] }) {
  if (!aiEnabled()) {
    return { score: null as number | null, temperature: null as string | null, reason: "IA não configurada.", note: "ai_not_configured" };
  }
  const r = await client().messages.create({
    model: MODEL,
    max_tokens: 400,
    system:
      "Você qualifica leads para uma equipe de vendas. Analise o histórico e atribua um score de 0 a 100 (quão pronto para comprar), uma temperatura (quente/morno/frio) e um motivo curto. Responda em português do Brasil.",
    messages: [
      {
        role: "user",
        content: `Contato: ${params.contactName ?? "Cliente"}${params.company ? ` (${params.company})` : ""}${params.tags?.length ? `\nTags: ${params.tags.join(", ")}` : ""}\n\nConversa:\n${transcript(params.messages) || "(sem mensagens ainda)"}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            score: { type: "integer" },
            temperature: { type: "string", enum: ["quente", "morno", "frio"] },
            reason: { type: "string" },
          },
          required: ["score", "temperature", "reason"],
        },
      },
    } as any,
  });
  const block = r.content.find((b) => b.type === "text");
  try {
    const parsed = JSON.parse(block && "text" in block ? block.text : "{}");
    return { score: parsed.score as number, temperature: parsed.temperature as string, reason: parsed.reason as string };
  } catch {
    return { score: null, temperature: null, reason: "Não foi possível analisar." };
  }
}
