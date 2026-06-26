import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

const money = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Página pública da proposta (sem login) — o cliente abre pelo link ?proposta=<id>. */
export default function PublicProposal({ publicId }: { publicId: string }) {
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet(`/public/proposal/${publicId}`)
      .then((d) => { setP(d); if (d?.status === "accepted") setAccepted(true); })
      .catch(() => setErr(true));
  }, [publicId]);

  async function accept() {
    setBusy(true);
    await apiPost(`/public/proposal/${publicId}/accept`, {}).catch(() => {});
    setAccepted(true);
    setBusy(false);
  }

  if (err) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-500">Proposta não encontrada.</div>;
  if (!p) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-400">Carregando…</div>;

  const color = p.brandColor || "#0ea5e9";
  const items: any[] = Array.isArray(p.items) ? p.items : [];

  return (
    <div className="min-h-screen bg-slate-50 py-10" style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div className="mx-auto max-w-2xl px-4">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="p-5 text-white" style={{ background: color }}>
            <div className="text-sm opacity-80">{p.brandName}</div>
            <div className="text-xl font-bold">{p.title}</div>
            {p.contactName && <div className="text-sm opacity-90">Para: {p.contactName}</div>}
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-2">Item</th>
                  <th className="text-center">Qtd</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-2">{it.description}</td>
                    <td className="text-center">{it.qty}</td>
                    <td className="text-right">{money(it.unitPrice)}</td>
                    <td className="text-right">{money((it.qty || 0) * (it.unitPrice || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-2xl font-bold" style={{ color }}>{money(p.total)}</span>
            </div>
            <div className="mt-5">
              {accepted ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">✓ Proposta aceita. Obrigado!</div>
              ) : (
                <button onClick={accept} disabled={busy} className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: color }}>
                  {busy ? "…" : "Aceitar proposta"}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-slate-400">Proposta gerada por {p.brandName}</div>
      </div>
    </div>
  );
}
