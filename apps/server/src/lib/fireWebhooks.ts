import { prisma } from "./prisma";

/**
 * Dispara os webhooks de saída ativos da empresa para um evento.
 * Best-effort: nunca quebra o fluxo principal; cada URL tem timeout curto.
 * Eventos: "message.received", "contact.created".
 */
export async function fireWebhooks(orgId: string, event: string, payload: any): Promise<void> {
  try {
    const hooks = await prisma.webhook.findMany({
      where: { orgId, active: true, OR: [{ event }, { event: "all" }] },
      select: { url: true },
    });
    if (hooks.length === 0) return;
    const body = JSON.stringify({ event, data: payload, at: new Date().toISOString() });
    await Promise.allSettled(
      hooks.map((h) =>
        fetch(h.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "SolutionsCRM-Webhook/1" },
          body,
          signal: AbortSignal.timeout(8000),
        }).catch(() => {})
      )
    );
  } catch {
    // ignora — webhook é best-effort
  }
}
