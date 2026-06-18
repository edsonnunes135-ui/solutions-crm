// Formatação de presença (último acesso e tempo de uso) — usada nos painéis.

/** "agora", "há 5 min", "há 2 h", "há 3 dias" ou "nunca acessou". */
export function relativeTime(date?: string | null): string {
  if (!date) return "nunca acessou";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 0) return "agora";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/** "3h 20min", "45 min" ou "—". */
export function usageLabel(minutes?: number): string {
  const m = Math.max(0, Math.round(minutes ?? 0));
  if (m === 0) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}min` : `${h}h`;
}
