import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import { Calendar, Plus, Trash2, Check, X, MapPin, User } from "lucide-react";

type Appt = { id: string; title: string; startAt: string; endAt?: string | null; location?: string | null; notes?: string | null; status: string; contactName?: string | null; assigneeName?: string | null };

export default function AgendaView({ token }: { token: string }) {
  const [items, setItems] = useState<Appt[]>([]);
  const [form, setForm] = useState({ title: "", startAt: "", location: "", notes: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await apiGet("/appointments", token).catch(() => []);
    setItems(Array.isArray(r) ? r : []);
  }
  useEffect(() => { load(); }, [token]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startAt || busy) return;
    setBusy(true);
    try {
      await apiPost("/appointments", { title: form.title, startAt: new Date(form.startAt).toISOString(), location: form.location || undefined, notes: form.notes || undefined }, token);
      setForm({ title: "", startAt: "", location: "", notes: "" });
      await load();
    } catch { alert("Não foi possível criar o compromisso."); }
    finally { setBusy(false); }
  }
  async function setStatus(id: string, status: string) { await apiPatch(`/appointments/${id}`, { status }, token); await load(); }
  async function remove(id: string) { if (!confirm("Excluir este compromisso?")) return; await apiDelete(`/appointments/${id}`, token); await load(); }

  // agrupa por dia
  const todayKey = new Date().toDateString();
  const tomorrowKey = new Date(Date.now() + 86400000).toDateString();
  const groups: { label: string; items: Appt[] }[] = [];
  const byDay: Record<string, Appt[]> = {};
  for (const a of items) (byDay[new Date(a.startAt).toDateString()] ||= []).push(a);
  for (const dayKey of Object.keys(byDay)) {
    const d = new Date(dayKey);
    const label = dayKey === todayKey ? "Hoje" : dayKey === tomorrowKey ? "Amanhã" : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    groups.push({ label, items: byDay[dayKey] });
  }

  const fmtTime = (s: string) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4 p-1">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white"><Calendar className="h-4 w-4" /></span>
          Agenda
        </h1>
        <p className="mt-1 text-sm text-slate-500">Seus compromissos e reuniões, organizados por dia.</p>
      </div>

      <form onSubmit={create} className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título (ex.: Reunião com João)" className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
          <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Local / link (opcional)" className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações (opcional)" className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" />
        </div>
        <div className="mt-2 flex justify-end">
          <button type="submit" disabled={busy || !form.title.trim() || !form.startAt} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"><Plus className="h-4 w-4" /> Agendar</button>
        </div>
      </form>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">Nenhum compromisso por aqui. Agende o primeiro acima. 📅</div>
      ) : (
        groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className={`h-2 w-2 rounded-full ${g.label === "Hoje" ? "bg-sky-500" : "bg-slate-300"}`} /> {g.label}
            </div>
            <div className="space-y-2">
              {g.items.map((a) => (
                <div key={a.id} className={`flex items-start justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:shadow-md ${a.status === "done" ? "opacity-60" : a.status === "canceled" ? "opacity-50 line-through" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">{fmtTime(a.startAt)}</span>
                      <span className="truncate font-medium text-slate-800">{a.title}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {a.contactName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {a.contactName}</span>}
                      {a.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>}
                      {a.notes && <span className="truncate">{a.notes}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.status === "scheduled" && (
                      <>
                        <button onClick={() => setStatus(a.id, "done")} className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Concluir"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setStatus(a.id, "canceled")} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Cancelar"><X className="h-4 w-4" /></button>
                      </>
                    )}
                    <button onClick={() => remove(a.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
