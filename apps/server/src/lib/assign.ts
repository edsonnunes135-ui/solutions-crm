import { prisma } from "./prisma";

/**
 * Fila de atendimento: distribui automaticamente uma conversa SEM dono para o
 * vendedor com MENOS conversas abertas (balanceamento simples). Só age quando a
 * empresa tem 2+ membros (org de 1 pessoa não precisa de fila).
 */
export async function autoAssignIfNeeded(orgId: string, conversationId: string): Promise<void> {
  try {
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId, orgId }, select: { assigneeId: true } });
    if (!conv || conv.assigneeId) return; // já tem dono

    const members = await prisma.membership.findMany({ where: { orgId }, select: { userId: true } });
    if (members.length < 2) return; // 1 pessoa só: não distribui

    // quantas conversas abertas cada membro já tem
    const counts = await prisma.conversation.groupBy({
      by: ["assigneeId"],
      where: { orgId, status: "open", assigneeId: { not: null } },
      _count: true,
    });
    const countByUser: Record<string, number> = {};
    for (const c of counts) if (c.assigneeId) countByUser[c.assigneeId] = (c as any)._count ?? 0;

    let best = members[0].userId;
    let bestN = countByUser[best] ?? 0;
    for (const m of members) {
      const n = countByUser[m.userId] ?? 0;
      if (n < bestN) { best = m.userId; bestN = n; }
    }
    await prisma.conversation.update({ where: { id: conversationId }, data: { assigneeId: best } });
  } catch {
    // best-effort: nunca quebra o recebimento de mensagens
  }
}
