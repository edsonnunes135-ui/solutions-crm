import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

const money = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "aguardando você", cls: "bg-sky-50 text-sky-700" },
  accepted: { label: "aceita ✓", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "recusada", cls: "bg-red-50 text-red-700" },
};

type Item = { publicId: string; title: string; total: number; status: string; createdAt: string };

/** Portal do cliente (sem login) — o cliente abre pelo link ?portal=<token> e vê as propostas dele. */
export default function PublicPortal({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    apiGet(`/public/portal/${token}`).then(setData).catch(() => setErr(true));
  }, [token]);

  if (err) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-500">Link inválido ou expirado.</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-400">Carregando…</div>;

  const color = data.brandColor || "#0ea5e9";
  const proposals: Item[] = Array.isArray(data.proposals) ? data.proposals : [];

  return (
    <div className="min-h-screen bg-slate-50 py-10" style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div className="mx-auto max-w-2xl px-4">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="p-6 text-white" style={{ background: color }}>
            <div className="text-sm opacity-80">{data.brandName}</div>
            <div className="text-2xl font-bold">Olá, {data.contactName} 👋</div>
            <div className="text-sm opacity-90">Aqui estão as suas propostas.</div>
          </div>
          <div className="p-5">
            {proposals.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhuma proposta disponível no momento.</div>
            ) : (
              <div className="space-y-2">
                {proposals.map((p) => (
                  <a
                    key={p.publicId}
                    href={`/?proposta=${p.publicId}`}
                    className="flex items-center justify-between rounded-xl border p-3 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">{p.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 ${STATUS[p.status]?.cls ?? "bg-slate-100"}`}>{STATUS[p.status]?.label ?? p.status}</span>
                        <span>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold" style={{ color }}>{money(p.total)}</div>
                      <div className="text-[11px] text-slate-400">ver →</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-slate-400">Portal seguro de {data.brandName}</div>
      </div>
    </div>
  );
}
