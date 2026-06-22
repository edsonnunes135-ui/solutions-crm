import { prisma } from "./prisma";
import { sendChannelMessage } from "./send";
import { pushToOrg } from "./push";

type FlowStep = {
  type: "message" | "ask" | "action";
  text?: string;
  saveAs?: string;
  action?: "tag" | "task" | "stage" | "handoff";
  value?: string;
};

/**
 * Executa o primeiro fluxo no-code cujo gatilho casa com a mensagem recebida.
 * É DETERMINÍSTICO — não depende da chave da IA. Retorna true se um fluxo
 * respondeu, para o webhook não acionar TAMBÉM o agente de IA (evita resposta dupla).
 */
export async function runMatchingFlow(params: {
  orgId: string;
  conversationId: string;
  contactId: string;
  contactName: string;
  channel: "whatsapp" | "instagram";
  text: string;
  isFirstInbound: boolean;
}): Promise<boolean> {
  const { orgId, conversationId, contactId, contactName, channel, text, isFirstInbound } = params;

  const flows = await prisma.flow.findMany({
    where: { orgId, active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  if (flows.length === 0) return false;

  // normaliza minúsculas e remove acentos, pra "preço" casar com "preco"
  const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const normText = norm(text);
  const match = flows.find((f) => {
    const triggers = Array.isArray(f.triggers) ? (f.triggers as unknown[]).map((t) => String(t)) : [];
    if (triggers.length === 0) return isFirstInbound; // sem gatilho = fluxo de boas-vindas (1ª mensagem)
    return triggers.some((t) => t && normText.includes(norm(t)));
  });
  if (!match) return false;

  const steps = (Array.isArray(match.steps) ? match.steps : []) as unknown as FlowStep[];
  let didSomething = false;
  for (const s of steps) {
    try {
      if ((s.type === "message" || s.type === "ask") && s.text) {
        await sendChannelMessage({ orgId, conversationId, channel, text: s.text });
        didSomething = true;
      } else if (s.type === "action") {
        await runAction({ orgId, contactId, contactName, step: s });
        didSomething = true;
      }
    } catch {
      // best-effort: um bloco com erro não derruba o resto do fluxo
    }
  }
  return didSomething;
}

async function runAction(p: { orgId: string; contactId: string; contactName: string; step: FlowStep }) {
  const { orgId, contactId, contactName, step } = p;
  if (step.action === "handoff") {
    pushToOrg(orgId, {
      title: `🙋 ${contactName} precisa de atendimento`,
      body: "Um fluxo pediu para passar a conversa para uma pessoa.",
      url: "/",
    }).catch(() => {});
    return;
  }
  const value = (step.value || "").trim();
  if (!value) return;
  if (step.action === "tag") {
    const tag = await prisma.tag.upsert({
      where: { orgId_name: { orgId, name: value } },
      update: {},
      create: { orgId, name: value },
    });
    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      update: {},
      create: { orgId, contactId, tagId: tag.id },
    });
  } else if (step.action === "task") {
    await prisma.task.create({ data: { orgId, contactId, title: value } });
  } else if (step.action === "stage") {
    const stage = await prisma.stage.findFirst({ where: { orgId, name: value } });
    if (stage) {
      const deal = await prisma.deal.findFirst({ where: { orgId, contactId }, orderBy: { createdAt: "desc" } });
      if (deal) await prisma.deal.update({ where: { id: deal.id }, data: { stageId: stage.id } });
    }
  }
}
