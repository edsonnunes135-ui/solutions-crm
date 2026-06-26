/**
 * Lógica PURA de casamento de fluxo (sem banco) — fácil de testar.
 * Usada pelo runMatchingFlow (lib/flows.ts).
 */

/** Minúsculas + remove acentos, pra "preço" casar com "preco". */
export function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Decide se um fluxo casa com a mensagem.
 * - Sem gatilhos: casa só na 1ª mensagem (fluxo de boas-vindas).
 * - Com gatilhos: casa se o texto (sem acento) contém algum gatilho (sem acento).
 */
export function flowMatches(triggers: string[], text: string, isFirstInbound: boolean): boolean {
  const list = Array.isArray(triggers) ? triggers.map((t) => String(t)) : [];
  if (list.length === 0) return isFirstInbound;
  const normText = normalize(text);
  return list.some((t) => !!t && normText.includes(normalize(t)));
}
