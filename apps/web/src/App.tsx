import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Users, KanbanSquare, Zap, LineChart as LineChartIcon,
  Sparkles, Search, Plus, Send, Clock, CheckCircle2, AlertCircle, Filter,
  Tag, Building2, Phone, Instagram, LogOut, X,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { apiGet, apiPatch, apiPost } from "./lib/api";
import { clearAuth, getToken, getUser } from "./lib/auth";
import AuthPage from "./pages/AuthPage";

type View = "inbox" | "pipeline" | "contacts" | "automations" | "analytics" | "ai";

// ── UI primitives ────────────────────────────────────────────────────────────

function currencyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border px-2 py-0.5 text-xs text-slate-600">{children}</span>;
}

function Button({ children, onClick, variant = "solid", className = "", disabled = false, type = "button" }: any) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition";
  const solid = "bg-slate-900 text-white hover:bg-slate-800";
  const outline = "border bg-white hover:bg-slate-50";
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`${base} ${variant === "outline" ? outline : solid} ${disabled ? "opacity-50" : ""} ${className}`}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}
function CardHeader({ children, className = "" }: any) {
  return <div className={`p-4 pb-3 ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: any) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>;
}

function Input({ value, onChange, placeholder, className = "", type = "text", required = false }: any) {
  return (
    <input type={type} required={required} value={value} onChange={onChange} placeholder={placeholder}
      className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${className}`} />
  );
}

function Textarea({ value, onChange, placeholder, className = "" }: any) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder}
      className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${className}`} />
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
      <div className="flex items-center gap-2">{icon}<span className="font-medium">{label}</span></div>
      <span className="text-xs text-slate-400">›</span>
    </button>
  );
}

function ChannelBadge({ c }: { c: string }) {
  return c === "whatsapp" ? (
    <Pill><span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> WhatsApp</span></Pill>
  ) : (
    <Pill><span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram</span></Pill>
  );
}

function PriorityPill({ p }: { p: string }) {
  const label = p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa";
  const icon = p === "high" ? <AlertCircle className="h-4 w-4" /> : p === "medium" ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />;
  const cls = p === "high" ? "border-red-300 text-red-700" : "border-slate-200 text-slate-700";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>{icon} {label}</span>;
}

function KPI({ title, value, hint }: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function Playbook({ title, items }: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="font-medium">{title}</div>
      <ul className="mt-2 space-y-1 text-sm text-slate-500">
        {items.map((i: string) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /><span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AutomationCard({ title, trigger, actions, enabled }: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-sm text-slate-500">Gatilho: {trigger}</div>
        </div>
        <Pill>
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> {enabled !== false ? "Ativo" : "Inativo"}
          </span>
        </Pill>
      </div>
      <div className="my-3 h-px bg-slate-200" />
      <ul className="space-y-1 text-sm">
        {actions.map((a: string) => (
          <li key={a} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /><span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="font-semibold">{title}</span>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) return <AuthPage onAuth={() => setAuthed(true)} />;
  return <CRMApp onLogout={() => setAuthed(false)} />;
}

function CRMApp({ onLogout }: { onLogout: () => void }) {
  const token = getToken()!;
  const user = getUser();

  const [view, setView] = useState<View>("inbox");
  const [q, setQ] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [c, d, t, p, k, a, s] = await Promise.all([
        apiGet("/contacts", token),
        apiGet("/deals", token),
        apiGet("/tasks", token),
        apiGet("/pipelines", token),
        apiGet("/analytics/kpis", token),
        apiGet("/automations", token),
        apiGet("/analytics/series", token).catch(() => []),
      ]);
      setContacts(c);
      setDeals(d);
      setTasks(t);
      setPipelines(p);
      setKpis(k);
      setAutomations(a);
      setSeries(s);
    } catch {
      // silently ignore — token may have expired
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-refresh a cada 30s para manter dados atualizados entre dispositivos
  useEffect(() => {
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, [reload]);

  // ── Selected contact / inbox ──────────────────────────────────────────────
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? contacts[0] ?? null,
    [contacts, selectedContactId]
  );

  const filteredContacts = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return contacts;
    return contacts.filter((c) =>
      [c.name, c.company, c.phone, c.lastMessage, (c.tags ?? []).join(" ")].join(" ").toLowerCase().includes(t)
    );
  }, [contacts, q]);

  const [messageDraft, setMessageDraft] = useState("");
  async function sendMessage() {
    const text = messageDraft.trim();
    if (!text || !selectedContact) return;
    setMessageDraft("");
    // Local optimistic update (no real channel connected yet)
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: text, lastAt: "agora" } : c))
    );
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const activePipeline = pipelines[0];
  const stages = activePipeline?.stages ?? [];
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  async function moveDeal(dealId: string, toStageId: string) {
    const stageName = (stages.find((s: any) => s.id === toStageId)?.name ?? "").toLowerCase();
    const status = stageName.includes("ganho") ? "won" : stageName.includes("perdido") ? "lost" : "open";
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stageId: toStageId, status } : d)));
    try {
      await apiPatch(`/deals/${dealId}`, { stageId: toStageId, status }, token);
    } catch {
      await reload();
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async function completeTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "done" } : t)));
    try {
      await apiPatch(`/tasks/${taskId}/complete`, {}, token);
    } catch {
      await reload();
    }
  }

  async function createTaskForContact(contact: any) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    try {
      const t = await apiPost("/tasks", {
        title: `Follow-up (${contact.name})`,
        dueAt: tomorrow.toISOString(),
        priority: "medium",
        contactId: contact.id,
      }, token);
      setTasks((prev) => [t, ...prev]);
    } catch { /* ignore */ }
  }

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newContactForm, setNewContactForm] = useState({ name: "", company: "", phone: "", tags: "" });
  const [newDealForm, setNewDealForm] = useState({ title: "", value: "", contactId: "", stageId: "" });
  const [formLoading, setFormLoading] = useState(false);

  async function submitNewContact(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    try {
      const tags = newContactForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const c = await apiPost("/contacts", { ...newContactForm, tags }, token);
      setContacts((prev) => [c, ...prev]);
      setShowNewContact(false);
      setNewContactForm({ name: "", company: "", phone: "", tags: "" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function submitNewDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!activePipeline) return alert("Crie um funil antes.");
    setFormLoading(true);
    try {
      const stageId = newDealForm.stageId || stages[0]?.id;
      const contactId = newDealForm.contactId || contacts[0]?.id;
      if (!stageId || !contactId) return alert("Selecione contato e etapa.");
      const d = await apiPost("/deals", {
        title: newDealForm.title,
        value: Number(newDealForm.value) || 0,
        pipelineId: activePipeline.id,
        stageId,
        contactId,
      }, token);
      setDeals((prev) => [d, ...prev]);
      setShowNewDeal(false);
      setNewDealForm({ title: "", value: "", contactId: "", stageId: "" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  // ── Analytics chart (dados reais da API) ──────────────────────────────────
  const analyticsSeries = series.length > 0 ? series : [{ day: "—", leads: 0, wins: 0 }];

  // Exporta contatos + negócios em CSV
  function exportCSV() {
    const rows = [
      ["tipo", "nome", "empresa", "telefone", "tags", "titulo_negocio", "valor", "etapa", "status"],
      ...contacts.map((c) => ["contato", c.name, c.company ?? "", c.phone ?? "", (c.tags ?? []).join(";"), "", "", "", ""]),
      ...deals.map((d) => ["negocio", d.contact?.name ?? "", "", "", "", d.title, String(d.value ?? 0), d.stage?.name ?? "", d.status ?? ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `solutions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── AI copilot ────────────────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState("Resuma a conversa e sugira a próxima ação.");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function runAI() {
    setAiLoading(true);
    setAiResult("");
    try {
      const context = selectedContact
        ? `Contato: ${selectedContact.name} (${selectedContact.company ?? "—"}). Última mensagem: "${selectedContact.lastMessage ?? "—"}". Tags: ${(selectedContact.tags ?? []).join(", ") || "nenhuma"}.`
        : "Nenhum contato selecionado.";
      const data = await apiPost("/ai/summarize", { context, goal: aiPrompt }, token);
      setAiResult(
        `Resumo: ${data.summary}\n\nPróxima ação: ${data.nextBestAction}\n\nSugestão de resposta:\n"${data.suggestedReply}"`
      );
    } catch (err: any) {
      setAiResult(`Erro: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  // ── Pipeline summary ──────────────────────────────────────────────────────
  const pipelineValue = useMemo(
    () => deals.filter((d) => d.status !== "won" && d.status !== "lost").reduce((s, d) => s + (d.value ?? 0), 0),
    [deals]
  );

  function logout() {
    clearAuth();
    onLogout();
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Carregando…</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "linear-gradient(rgba(2,6,23,0.55), rgba(2,6,23,0.75)), url(/logo.jpeg)" }}
    >
      {showNewContact && (
        <Modal title="Novo contato" onClose={() => setShowNewContact(false)}>
          <form onSubmit={submitNewContact} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <Input required value={newContactForm.name} onChange={(e: any) => setNewContactForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ana Martins" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Empresa</label>
              <Input value={newContactForm.company} onChange={(e: any) => setNewContactForm((p) => ({ ...p, company: e.target.value }))} placeholder="Loja Aurora" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
              <Input value={newContactForm.phone} onChange={(e: any) => setNewContactForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+55 21 99999-0000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tags (separadas por vírgula)</label>
              <Input value={newContactForm.tags} onChange={(e: any) => setNewContactForm((p) => ({ ...p, tags: e.target.value }))} placeholder="Quente, Varejo" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={formLoading} className="flex-1">{formLoading ? "Salvando…" : "Criar contato"}</Button>
              <Button variant="outline" onClick={() => setShowNewContact(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {showNewDeal && (
        <Modal title="Novo negócio" onClose={() => setShowNewDeal(false)}>
          <form onSubmit={submitNewDeal} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Título *</label>
              <Input required value={newDealForm.title} onChange={(e: any) => setNewDealForm((p) => ({ ...p, title: e.target.value }))} placeholder="Plano Growth – Loja Aurora" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valor (R$)</label>
              <Input type="number" value={newDealForm.value} onChange={(e: any) => setNewDealForm((p) => ({ ...p, value: e.target.value }))} placeholder="4800" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contato</label>
              <select
                value={newDealForm.contactId}
                onChange={(e) => setNewDealForm((p) => ({ ...p, contactId: e.target.value }))}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Selecione…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Etapa</label>
              <select
                value={newDealForm.stageId}
                onChange={(e) => setNewDealForm((p) => ({ ...p, stageId: e.target.value }))}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Selecione…</option>
                {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={formLoading} className="flex-1">{formLoading ? "Salvando…" : "Criar negócio"}</Button>
              <Button variant="outline" onClick={() => setShowNewDeal(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="Solutions" className="h-10 w-10 rounded-2xl object-cover ring-2 ring-white/20" />
              <h1 className="text-2xl font-semibold tracking-tight text-white">Solutions</h1>
              <span className="rounded-full border border-white/30 px-2 py-0.5 text-xs text-white/80">CRM Conversacional</span>
            </div>
            <p className="text-sm text-slate-300">Olá, {user?.name ?? "usuário"} — centralize WhatsApp + Instagram, funis, tarefas, automações, BI e IA.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar contatos, empresa, tags…" className="pl-9" />
            </div>
            <Button className="gap-2" onClick={() => setShowNewContact(true)}>
              <Plus className="h-4 w-4" /> Novo lead
            </Button>
            <button onClick={logout} className="rounded-2xl border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <Card>
            <CardHeader>
              <div className="text-base font-semibold">Navegação</div>
              <div className="text-sm text-slate-500">{user?.email}</div>
            </CardHeader>
            <CardContent className="space-y-1">
              <NavItem icon={<MessageSquare className="h-4 w-4" />} active={view === "inbox"} onClick={() => setView("inbox")} label="Inbox" />
              <NavItem icon={<KanbanSquare className="h-4 w-4" />} active={view === "pipeline"} onClick={() => setView("pipeline")} label="Funil" />
              <NavItem icon={<Users className="h-4 w-4" />} active={view === "contacts"} onClick={() => setView("contacts")} label="Contatos" />
              <NavItem icon={<Zap className="h-4 w-4" />} active={view === "automations"} onClick={() => setView("automations")} label="Automações" />
              <NavItem icon={<LineChartIcon className="h-4 w-4" />} active={view === "analytics"} onClick={() => setView("analytics")} label="BI" />
              <NavItem icon={<Sparkles className="h-4 w-4" />} active={view === "ai"} onClick={() => setView("ai")} label="IA" />

              <div className="my-3 h-px bg-slate-200" />
              <div className="grid gap-2">
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-slate-500">Pipeline aberto</div>
                  <div className="mt-1 text-base font-semibold">{currencyBRL(kpis?.pipelineValue ?? pipelineValue)}</div>
                </div>
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-slate-500">Tarefas abertas</div>
                  <div className="mt-1 text-base font-semibold">{kpis?.tasksOpen ?? tasks.filter((t) => t.status === "open").length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main content */}
          <div className="space-y-4">
            {/* ── INBOX ── */}
            {view === "inbox" && (
              <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold">Conversas</div>
                      <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> Filtros</Button>
                    </div>
                    <div className="text-sm text-slate-500">{contacts.length} contatos</div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[520px] overflow-auto pr-2">
                      {filteredContacts.length === 0 ? (
                        <div className="rounded-2xl border p-4 text-sm text-slate-500 text-center">
                          Nenhum contato ainda.{" "}
                          <button onClick={() => setShowNewContact(true)} className="text-slate-900 underline">Criar contato</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredContacts.map((c) => (
                            <button key={c.id} onClick={() => setSelectedContactId(c.id)}
                              className={`w-full rounded-2xl border p-3 text-left transition ${c.id === (selectedContact?.id) ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate font-medium">{c.name}</span>
                                    {c.channel && <ChannelBadge c={c.channel} />}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span className="truncate">{c.company ?? "—"}</span>
                                  </div>
                                </div>
                                <span className="shrink-0 text-xs text-slate-400">{c.phone ?? ""}</span>
                              </div>
                              {c.lastMessage && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.lastMessage}</p>}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(c.tags ?? []).slice(0, 3).map((t: string) => (
                                  <Pill key={t}><span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {t}</span></Pill>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{selectedContact?.name ?? "Selecione um contato"}</div>
                        <div className="truncate text-sm text-slate-500">{selectedContact?.company ?? ""}</div>
                      </div>
                      {selectedContact?.channel && <ChannelBadge c={selectedContact.channel} />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border p-3">
                      <p className="text-sm text-slate-500">Histórico de mensagens aparece aqui após webhook do WhatsApp/Instagram ser configurado.</p>
                      {selectedContact && (
                        <>
                          <div className="my-3 h-px bg-slate-200" />
                          <div className="space-y-2">
                            {selectedContact.lastMessage && (
                              <div className="flex justify-start">
                                <div className="max-w-[85%] rounded-2xl border bg-white px-3 py-2">
                                  <div className="text-sm">{selectedContact.lastMessage}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Textarea value={messageDraft} onChange={(e: any) => setMessageDraft(e.target.value)} placeholder="Escreva uma resposta…" className="min-h-[44px]" />
                      <Button onClick={sendMessage} disabled={!selectedContact} className="h-[44px]">
                        <Send className="h-4 w-4" /> Enviar
                      </Button>
                    </div>

                    {selectedContact && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <button
                          className="rounded-2xl border p-4 text-left transition hover:bg-slate-50"
                          onClick={() => createTaskForContact(selectedContact)}
                        >
                          <div className="font-medium">Criar tarefa</div>
                          <div className="mt-1 text-sm text-slate-500">Follow-up para amanhã 10h</div>
                        </button>
                        <button
                          className="rounded-2xl border p-4 text-left transition hover:bg-slate-50"
                          onClick={() => { setNewDealForm((p) => ({ ...p, contactId: selectedContact.id })); setShowNewDeal(true); }}
                        >
                          <div className="font-medium">Adicionar ao funil</div>
                          <div className="mt-1 text-sm text-slate-500">Cria negócio para este lead</div>
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── PIPELINE ── */}
            {view === "pipeline" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{activePipeline?.name ?? "Funil"}</h2>
                    <p className="text-sm text-slate-500">{deals.length} negócios • {currencyBRL(pipelineValue)} em aberto</p>
                  </div>
                  <Button className="gap-2" onClick={() => setShowNewDeal(true)}>
                    <Plus className="h-4 w-4" /> Novo negócio
                  </Button>
                </div>
                {stages.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-slate-500">
                      Nenhum funil cadastrado. Um funil padrão é criado automaticamente no primeiro registro.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(stages.length, 5)}, minmax(0,1fr))` }}>
                    {stages.map((s: any) => {
                      const stageDeals = deals.filter((d) => d.stageId === s.id);
                      return (
                        <Card
                          key={s.id}
                          className={dragOverStage === s.id ? "ring-2 ring-blue-400" : ""}
                        >
                          <div
                            onDragOver={(e) => { e.preventDefault(); setDragOverStage(s.id); }}
                            onDragLeave={() => setDragOverStage((p) => (p === s.id ? null : p))}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverStage(null);
                              const dealId = e.dataTransfer.getData("dealId");
                              if (dealId) moveDeal(dealId, s.id);
                            }}
                            className="min-h-full"
                          >
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="text-base font-semibold">{s.name}</div>
                                <Pill>{stageDeals.length}</Pill>
                              </div>
                              <div className="text-sm text-slate-500">{currencyBRL(stageDeals.reduce((a, d) => a + (d.value ?? 0), 0))}</div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {stageDeals.map((d) => (
                                <div
                                  key={d.id}
                                  draggable
                                  onDragStart={(e) => e.dataTransfer.setData("dealId", d.id)}
                                  className="cursor-grab rounded-2xl border p-3 transition hover:shadow-md active:cursor-grabbing"
                                >
                                  <div className="font-medium text-sm">{d.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">{currencyBRL(d.value ?? 0)} • {d.contact?.name ?? "—"}</div>
                                  <div className="mt-3 flex flex-wrap gap-1">
                                    {stages.filter((x: any) => x.id !== s.id).slice(0, 3).map((x: any) => (
                                      <Button key={x.id} variant="outline" className="px-2 py-1 text-xs" onClick={() => moveDeal(d.id, x.id)}>
                                        → {x.name}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {stageDeals.length === 0 && <div className="rounded-2xl border p-3 text-sm text-slate-400">Arraste um card aqui</div>}
                            </CardContent>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── CONTACTS ── */}
            {view === "contacts" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold">Contatos</div>
                      <div className="text-sm text-slate-500">{contacts.length} cadastrados</div>
                    </div>
                    <Button className="gap-2" onClick={() => setShowNewContact(true)}>
                      <Plus className="h-4 w-4" /> Novo contato
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {contacts.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      Nenhum contato ainda.{" "}
                      <button onClick={() => setShowNewContact(true)} className="text-slate-900 underline">Criar o primeiro</button>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {filteredContacts.map((c) => (
                        <div key={c.id} className="rounded-2xl border p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{c.name}</div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                <Building2 className="h-4 w-4" />
                                <span className="truncate">{c.company ?? "—"}</span>
                              </div>
                              {c.phone && <div className="mt-1 text-xs text-slate-400">{c.phone}</div>}
                            </div>
                            {c.channel && <ChannelBadge c={c.channel} />}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(c.tags ?? []).map((t: string) => <Pill key={t}>{t}</Pill>)}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button variant="solid" className="text-xs" onClick={() => { setSelectedContactId(c.id); setView("inbox"); }}>
                              Abrir conversa
                            </Button>
                            <Button variant="outline" className="text-xs" onClick={() => { setNewDealForm((p) => ({ ...p, contactId: c.id })); setShowNewDeal(true); }}>
                              + Negócio
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── TASKS inline ── (aparece em qualquer view como painel) */}
            {(view === "inbox" || view === "contacts") && tasks.filter((t) => t.status === "open").length > 0 && (
              <Card>
                <CardHeader><div className="text-base font-semibold">Tarefas abertas</div></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.filter((t) => t.status === "open").slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-2xl border p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t.title}</div>
                          {t.dueAt && <div className="text-xs text-slate-500">{new Date(t.dueAt).toLocaleString("pt-BR")}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityPill p={t.priority ?? "medium"} />
                          <Button variant="outline" className="text-xs px-2 py-1" onClick={() => completeTask(t.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── AUTOMATIONS ── */}
            {view === "automations" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold">Automações</div>
                      <div className="text-sm text-slate-500">Motor de eventos ativo — {automations.length} fluxos cadastrados</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {automations.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {automations.map((a) => (
                        <AutomationCard
                          key={a.id}
                          title={a.name}
                          trigger={a.triggerType}
                          actions={Array.isArray(a.actions) ? a.actions.map((x: any) => x.type ?? JSON.stringify(x)) : [JSON.stringify(a.actions)]}
                          enabled={a.enabled}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <AutomationCard title="Lead sem resposta em 15 min" trigger="message_received" actions={["Criar tarefa alta prioridade", "Adicionar tag: Sem resposta"]} />
                      <AutomationCard title="Entrou em Proposta" trigger="stage_changed" actions={["Gerar tarefa: Follow-up 24h", "Enviar template WhatsApp"]} />
                      <AutomationCard title="Reativação 30 dias" trigger="inactivity" actions={["Mover para funil de apoio", "Criar tarefa: ligação"]} />
                      <AutomationCard title="Não-lead (atendimento)" trigger="message_received" actions={["Mover para funil de não-leads", "Criar ticket"]} />
                    </div>
                  )}
                  <div className="rounded-2xl border p-4 text-sm text-slate-500">
                    Motor de automações: gatilhos por evento (mensagem/etapa/tag), condições e ações (tarefas, mensagens, webhooks) — com logs e execução assíncrona via BullMQ.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── ANALYTICS ── */}
            {view === "analytics" && (
              <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">BI</div>
                    <div className="text-sm text-slate-500">Dados reais da sua organização</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <KPI title="Leads (total)" value={kpis?.leads ?? contacts.length} hint="Contatos cadastrados" />
                      <KPI title="Negócios abertos" value={kpis?.openDeals ?? deals.filter((d) => d.status === "open").length} hint="No funil ativo" />
                      <KPI title="Pipeline" value={currencyBRL(kpis?.pipelineValue ?? pipelineValue)} hint="Valor em aberto" />
                    </div>
                    <div className="my-4 h-px bg-slate-200" />
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="leads" strokeWidth={2} dot={false} name="Leads" />
                          <Line type="monotone" dataKey="wins" strokeWidth={2} dot={false} stroke="#22c55e" name="Ganhos" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Relatórios rápidos</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full" onClick={exportCSV}>Exportar (CSV)</Button>
                    <div className="h-px bg-slate-200" />
                    <MiniStat label="Contatos" value={kpis?.leads ?? contacts.length} />
                    <MiniStat label="Tarefas abertas" value={kpis?.tasksOpen ?? tasks.filter((t) => t.status === "open").length} />
                    <MiniStat label="Negócios" value={deals.length} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── AI ── */}
            {view === "ai" && (
              <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Copiloto de IA</div>
                    <div className="text-sm text-slate-500">
                      {selectedContact ? `Contexto: ${selectedContact.name}` : "Selecione um contato no Inbox para contexto"}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea value={aiPrompt} onChange={(e: any) => setAiPrompt(e.target.value)} className="min-h-[90px]" placeholder="Instrução para a IA…" />
                    <Button onClick={runAI} disabled={aiLoading} className="gap-2">
                      <Sparkles className="h-4 w-4" /> {aiLoading ? "Gerando…" : "Rodar IA"}
                    </Button>
                    <div className="rounded-2xl border p-4 whitespace-pre-wrap text-sm min-h-[120px]">
                      {aiResult || "Resultado aparecerá aqui…"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Playbooks</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Playbook title="Qualificação rápida" items={["Dor + urgência", "Orçamento", "Decisor", "Próximo passo"]} />
                    <Playbook title="Proposta" items={["Resumo do combinado", "Prazo", "Condições", "CTA"]} />
                    <Playbook title="Reativação" items={["Motivo do sumiço", "Oferta específica", "Prazo", "Pergunta fechada"]} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
