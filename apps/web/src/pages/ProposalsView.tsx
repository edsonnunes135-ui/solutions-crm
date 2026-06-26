import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import { FileText, Plus, Trash2 } from "lucide-react";

type Item = { description: string; qty: number; unitPrice: number };
type Proposal = { id: string; publicId: string; title: string; contactName?: string | null; items: Item[]; total: number; status: string };

const money = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "rascunho", cls: "bg-slate-100 text-slate-600" },
  sent: { label: "enviada", cls: "bg-sky-50 text-sky-700" },
  accepted: { label: "aceita ✓", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "recusada", cls: "bg-red-50 text-red-700" },
};

export default function ProposalsView({ token }: { token: string }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ title: string; contactName: string; lines: Item[] }>({ title: "", contactName: "", lines: [{ description: "", qty: 1, unitPrice: 0 }] });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkOf = (pid: string) => `${origin}/?proposta=${pid}`;

  async function load() { const r = await apiGet("/proposals", token).catch(() => []); setItems(Array.isArray(r) ? r : []); }
  useEffect(() => { load(); }, [token]);

  const total = form.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
  function setLine(i: number, patch: Partial<Item>) { setForm({ ...form, lines: form.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }); }
  function addLine() { setForm({ ...form, lines: [...form.lines, { description: "", qty: 1, unitPrice: 0 }] }); }
  function rmLine(i: number) { setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) }); }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const lines = form.lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description, qty: Number(l.qty) || 1, unitPrice: Number(l.unitPrice) || 0 }));
    if (!form.title.trim() || lines.length === 0 || busy) return;
    setBusy(true);
    try {
      await apiPost("/proposals", { title: form.title, contactName: form.contactName || undefined, items: lines }, token);
      setForm({ title: "", contactName: "", lines: [{ description: "", qty: 1, unitPrice: 0 }] });
      setCreating(false);
      await load();
    } catch { alert("Não foi possível criar a proposta."); }
    finally { setBusy(false); }
  }
  async function setStatus(id: string, status: string) { await apiPatch(`/proposals/${id}`, { status }, token); await load(); }
  async function remove(id: string) { if (!confirm("Excluir esta proposta?")) return; await apiDelete(`/proposals/${id}`, token); await load(); }
  function copy(pid: string) { navigator.clipboard?.writeText(linkOf(pid)); setCopied(pid); setTimeout(() => setCopied(""), 2000); }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><FileText className="h-5 w-5 text-sky-500" /> Propostas / Orçamentos</h1>
          <p className="mt-1 text-sm text-slate-500">Monte um orçamento e mande o link pro cliente ver e aceitar.</p>
        </div>
        <button onClick={() => setCreating((c) => !c)} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"><Plus className="h-4 w-4" /> Nova proposta</button>
      </div>

      {creating && (
        <form onSubmit={create} className="space-y-3 rounded-2xl border bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título (ex.: Proposta de serviço)" className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
            <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Cliente (nome)" className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
          </div>
          <div className="space-y-2">
            {form.lines.map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Item / serviço" className="min-w-[160px] flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
                <input type="number" min={0} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} placeholder="Qtd" className="w-20 rounded-xl border px-3 py-2 text-sm outline-none" />
                <input type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} placeholder="Valor un." className="w-28 rounded-xl border px-3 py-2 text-sm outline-none" />
                <span className="w-24 text-right text-sm text-slate-600">{money((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</span>
                {form.lines.length > 1 && <button type="button" onClick={() => rmLine(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-xs text-sky-600 hover:text-sky-800">+ adicionar item</button>
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-sm font-medium text-slate-700">Total: <strong className="text-lg">{money(total)}</strong></span>
            <button type="submit" disabled={busy || !form.title.trim()} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50">{busy ? "Salvando…" : "Criar proposta"}</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">Nenhuma proposta ainda. Crie a primeira. 📄</div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-800">{p.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS[p.status]?.cls ?? "bg-slate-100"}`}>{STATUS[p.status]?.label ?? p.status}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{p.contactName ? `${p.contactName} · ` : ""}{money(p.total)} · {(p.items?.length ?? 0)} item(ns)</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => copy(p.publicId)} className="rounded-lg border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">{copied === p.publicId ? "Copiado! ✓" : "Copiar link"}</button>
                  {p.status === "draft" && <button onClick={() => setStatus(p.id, "sent")} className="rounded-lg border px-2 py-1 text-xs text-sky-600 hover:bg-sky-50">Marcar enviada</button>}
                  <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
