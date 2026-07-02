import React, { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import ChatBox from "../components/ChatBox";
import { getUser } from "../lib/auth";
import { apiGet } from "../lib/api";
import { relativeTime } from "../lib/presence";

interface Thread {
  orgId: string;
  orgName: string;
  lastBody: string;
  lastAt: string;
  lastFromCeo: boolean;
  count: number;
}

export default function SuporteCeoView({ token }: { token: string }) {
  const meId = getUser()?.id ?? "";
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sel, setSel] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const t = await apiGet("/admin/support/threads", token);
      setThreads(Array.isArray(t) ? t : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 p-1">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 text-white"><LifeBuoy className="h-4 w-4" /></span> Suporte aos clientes</h1>
          <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">CEO</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">Conversas de suporte das empresas assinantes. Responda em tempo real.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b px-4 py-3 text-sm font-medium text-slate-600">Conversas ({threads.length})</div>
          <div className="max-h-[460px] overflow-y-auto">
            {loading && <div className="p-4 text-sm text-slate-400">Carregando…</div>}
            {!loading && threads.length === 0 && <div className="p-4 text-sm text-slate-400">Nenhuma conversa de suporte ainda.</div>}
            {threads.map((t) => (
              <button
                key={t.orgId}
                onClick={() => setSel(t)}
                className={`block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${sel?.orgId === t.orgId ? "bg-slate-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate font-medium text-slate-800">{t.orgName}</div>
                  <div className="shrink-0 text-[11px] text-slate-400">{relativeTime(t.lastAt)}</div>
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {t.lastFromCeo ? "Você: " : ""}
                  {t.lastBody}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {sel ? (
            <>
              <div className="mb-2 text-sm font-medium text-slate-600">Conversa com <span className="text-slate-900">{sel.orgName}</span></div>
              <ChatBox
                key={sel.orgId}
                token={token}
                loadPath={`/admin/support/${sel.orgId}`}
                sendPath={`/admin/support/${sel.orgId}`}
                meId={meId}
                placeholder={`Responder ${sel.orgName}…`}
                emptyHint="Sem mensagens nesta conversa."
                heightClass="h-[400px]"
              />
            </>
          ) : (
            <div className="grid h-[460px] place-items-center rounded-2xl border border-slate-200/80 bg-white text-sm text-slate-400 shadow-sm">
              Selecione uma conversa à esquerda para responder.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
