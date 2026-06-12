import React, { useEffect, useMemo, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}

interface Props {
  token: string;
  contacts: any[];
}

export default function CampaignsView({ token, contacts }: Props) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "instagram">("whatsapp");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => (c.tags ?? []).forEach((t: string) => s.add(t)));
    return [...s].sort();
  }, [contacts]);

  const audience = useMemo(() => {
    let list = contacts.filter((c) => !c.conversationDeletedAt);
    if (tag) list = list.filter((c) => (c.tags ?? []).includes(tag));
    return list.length;
  }, [contacts, tag]);

  function loadHistory() {
    apiGet("/broadcasts", token).then(setHistory).catch(() => {});
  }
  useEffect(loadHistory, [token]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Enviar esta mensagem para até ${audience} contato(s)${tag ? ` com a tag "${tag}"` : ""}?`)) return;
    setSending(true);
    setResult(null);
    try {
      const r = await apiPost("/broadcasts", { text, tag: tag || undefined, channel }, token);
      setResult(r);
      setText("");
      loadHistory();
    } catch (err: any) {
      const msg = err.message.includes("plan_upgrade_required")
        ? "Campanhas em massa estão disponíveis nos planos Pro e Business. Faça upgrade em Configurações → Plano."
        : err.message;
      setResult({ error: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Megaphone className="h-5 w-5 text-orange-500" /> Campanhas em massa
          </div>
          <div className="text-sm text-slate-500">Dispare uma mensagem para vários contatos de uma vez, filtrando por tag</div>
        </div>
        <div className="p-4 pt-0">
          <form onSubmit={send} className="space-y-3 max-w-2xl">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Público (tag)</label>
                <select value={tag} onChange={(e) => setTag(e.target.value)} className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200">
                  <option value="">Todos os contatos</option>
                  {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canal</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mensagem *</label>
              <textarea required value={text} onChange={(e) => setText(e.target.value)} placeholder="Olá! Temos uma condição especial essa semana…" className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 min-h-[100px]" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={sending || !text.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                <Send className="h-4 w-4" /> {sending ? "Enviando…" : `Enviar para ~${audience} contato(s)`}
              </button>
            </div>
          </form>

          {result && (
            <div className={`mt-4 rounded-2xl border p-4 text-sm max-w-2xl ${result.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>
              {result.error ? result.error : (
                <>
                  <div className="font-medium">Campanha enviada!</div>
                  <div className="mt-1">✅ Entregues: {result.sent} • ⚠️ Falhas: {result.failed} • ⏭️ Sem conversa ativa: {result.skipped}</div>
                  {result.skipped > 0 && <div className="mt-1 text-xs">Contatos "sem conversa ativa" ainda não mandaram mensagem no canal — a Meta só permite responder conversas iniciadas pelo cliente (ou via template aprovado, em breve).</div>}
                  {result.errors?.length > 0 && <div className="mt-1 text-xs">{result.errors.join(" • ")}</div>}
                </>
              )}
            </div>
          )}

          <div className="mt-4 rounded-2xl border p-4 text-xs text-slate-500 max-w-2xl">
            ⚠️ Regra da Meta: mensagens em massa só chegam para quem já conversou com você nas últimas 24h. Para alcançar contatos frios é preciso usar templates aprovados — recurso que entra na próxima versão.
          </div>
        </div>
      </Card>

      {history.length > 0 && (
        <Card>
          <div className="p-4 pb-3 text-base font-semibold">Histórico de campanhas</div>
          <div className="p-4 pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-2">Data</th><th>Mensagem</th><th>Público</th><th>Entregues</th><th>Falhas</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 text-slate-500">{new Date(h.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="max-w-[220px] truncate">{h.text}</td>
                    <td>{h.tag ?? "Todos"}</td>
                    <td className="text-green-600 font-medium">{h.sent}</td>
                    <td className={h.failed > 0 ? "text-red-600" : ""}>{h.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
