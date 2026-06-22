import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Users, KanbanSquare, Zap, LineChart as LineChartIcon,
  Sparkles, Search, Plus, Send, Clock, CheckCircle2, AlertCircle, Filter,
  Tag, Building2, Phone, Instagram, LogOut, X, Crown, Settings as SettingsIcon, Trash2, Eye, EyeOff, Megaphone, UserCheck, Home, Moon, Sun, Command, MessagesSquare, LifeBuoy, Video, Bot,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { apiGet, apiPatch, apiPost, apiDelete } from "./lib/api";
import { clearAuth, getToken, getUser, impersonatingName, exitImpersonation } from "./lib/auth";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import TechBackground from "./components/TechBackground";
import ManagerView from "./pages/ManagerView";
import SettingsView from "./pages/SettingsView";
import AutomationsView from "./pages/AutomationsView";
import FlowsView from "./pages/FlowsView";
import CampaignsView from "./pages/CampaignsView";
import CopilotView from "./pages/CopilotView";
import HomeView from "./pages/HomeView";
import FaturamentoSolutions from "./pages/FaturamentoSolutions";
import AcessosView from "./pages/AcessosView";
import TemplatesView from "./pages/TemplatesView";
import PresencaView from "./pages/PresencaView";
import VendedoresView from "./pages/VendedoresView";
import ComunicacaoView from "./pages/ComunicacaoView";
import SuporteView from "./pages/SuporteView";
import SuporteCeoView from "./pages/SuporteCeoView";
import ReunioesView from "./pages/ReunioesView";

type View = "home" | "inbox" | "pipeline" | "contacts" | "automations" | "flows" | "analytics" | "ai" | "manager" | "settings" | "campaigns" | "solutions" | "acessos" | "templates" | "presenca" | "vendedores" | "comunicacao" | "suporte" | "suporte-ceo" | "reunioes";

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
  // white-label: link do parceiro (?marca=<orgId>) abre direto o cadastro com a marca dele
  const marca = new URLSearchParams(window.location.search).get("marca") || "";
  const [authed, setAuthed] = useState(!!getToken());
  const [auth, setAuth] = useState<null | "login" | "register">(null);

  if (authed) return <CRMApp onLogout={() => { setAuthed(false); setAuth(null); }} />;
  if (auth || marca) return <AuthPage initialMode={auth ?? "register"} marca={marca} onAuth={() => setAuthed(true)} onBack={() => setAuth(null)} />;
  return <LandingPage onEnter={() => setAuth("login")} onSignup={() => setAuth("register")} />;
}

function CRMApp({ onLogout }: { onLogout: () => void }) {
  const token = getToken()!;
  const user = getUser();
  const isManager = user?.role === "owner" || user?.role === "partner" || user?.role === "admin";

  // CEO da plataforma (só o dono) — define pelo backend, não dá pra forjar pela UI
  const [isCeo, setIsCeo] = useState(false);
  useEffect(() => {
    apiGet("/admin/status", token)
      .then((r) => setIsCeo(!!r?.isPlatformAdmin))
      .catch(() => setIsCeo(false));
  }, [token]);

  // Aviso global da plataforma (o CEO dispara, todos veem) + modo suporte
  const [notice, setNotice] = useState<{ id: string; message: string; level: string } | null>(null);
  const [noticeHidden, setNoticeHidden] = useState(false);
  useEffect(() => {
    apiGet("/notices/active", token).then(setNotice).catch(() => setNotice(null));
  }, [token]);
  const impName = impersonatingName();

  // Presença: avisa o servidor que este usuário está ativo (batimento a cada 60s)
  useEffect(() => {
    const ping = () => apiPost("/presence/ping", {}, token).catch(() => {});
    ping();
    const t = setInterval(ping, 60000);
    return () => clearInterval(t);
  }, [token]);

  const [view, setView] = useState<View>("home");
  const [q, setQ] = useState("");

  // Modo privacidade: oculta valores financeiros (persiste entre sessões)
  const [hideValues, setHideValues] = useState(() => localStorage.getItem("solutions_hide_values") === "1");
  function toggleHideValues() {
    setHideValues((p) => {
      localStorage.setItem("solutions_hide_values", p ? "0" : "1");
      return !p;
    });
  }
  const money = (v: number) => (hideValues ? "R$ ••••••" : currencyBRL(v));

  // Modo escuro (persiste entre sessões)
  const [dark, setDark] = useState(() => localStorage.getItem("solutions_dark") === "1");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("solutions_dark", dark ? "1" : "0");
  }, [dark]);

  // Aviso amigável de upgrade quando uma ação esbarra num limite/recurso do plano
  useEffect(() => {
    const fn = (e: any) => setPlanLimit({ note: e?.detail?.note || "Esse recurso não está incluído no seu plano atual." });
    window.addEventListener("plan-limit", fn as any);
    return () => window.removeEventListener("plan-limit", fn as any);
  }, []);

  // Marca white-label (por organização)
  const [brand, setBrand] = useState<{ brandName?: string; brandColor?: string; brandLogoUrl?: string }>({});
  useEffect(() => {
    apiGet("/branding", token)
      .then((b) => {
        setBrand(b);
        // White-label: o título da aba/PWA passa a exibir a marca do cliente
        if (b?.brandName) document.title = b.brandName;
        if (b?.brandLogoUrl) {
          const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (link) link.href = b.brandLogoUrl;
        }
      })
      .catch(() => {});
  }, [token]);

  // Command palette (Ctrl/Cmd + K)
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQ, setPaletteQ] = useState("");
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowPalette((p) => !p);
        setPaletteQ("");
      }
      if (e.key === "Escape") setShowPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [planLimit, setPlanLimit] = useState<{ note: string } | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [automations, setAutomations] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [c, d, t, p, k, a, s, tm, b] = await Promise.all([
        apiGet("/contacts", token).catch(() => []),
        apiGet("/deals", token).catch(() => []),
        apiGet("/tasks", token).catch(() => []),
        apiGet("/pipelines", token).catch(() => []),
        apiGet("/analytics/kpis", token).catch(() => null),
        apiGet("/automations", token).catch(() => []),
        apiGet("/analytics/series", token).catch(() => []),
        apiGet("/team", token).catch(() => []),
        apiGet("/billing", token).catch(() => null),
      ]);
      setContacts(c);
      setDeals(d);
      setTasks(t);
      setPipelines(p);
      setSelectedPipelineId((cur) => cur || p[0]?.id || "");
      setKpis(k);
      setAutomations(a);
      setSeries(s);
      setTeam(tm);
      setBilling(b);
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
    () => contacts.find((c) => c.id === selectedContactId) ?? contacts.find((c) => !c.conversationDeletedAt) ?? null,
    [contacts, selectedContactId]
  );

  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const [inboxFolder, setInboxFolder] = useState<"active" | "deleted">("active");
  const [showFilters, setShowFilters] = useState(false);

  const filteredContacts = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = contacts.filter((c) => (inboxFolder === "deleted" ? !!c.conversationDeletedAt : !c.conversationDeletedAt));
    if (channelFilter !== "all") list = list.filter((c) => c.channel === channelFilter);
    if (!t) return list;
    return list.filter((c) =>
      [c.name, c.company, c.phone, c.lastMessage, (c.tags ?? []).join(" ")].join(" ").toLowerCase().includes(t)
    );
  }, [contacts, q, channelFilter, inboxFolder]);

  async function deleteConversation(contactId: string, name: string) {
    if (!confirm(`Mover a conversa de ${name} para a pasta de apagados?`)) return;
    // some imediatamente da lista
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, conversationDeletedAt: new Date().toISOString() } : c)));
    if (selectedContact?.id === contactId) {
      setSelectedContactId(null);
      setThread({ conversationId: null, channel: "whatsapp", messages: [] });
    }
    try {
      await apiDelete(`/contacts/${contactId}/conversations`, token);
    } catch (err: any) {
      alert(`Não foi possível excluir: ${err.message}`);
      await reload();
    }
  }

  // Fila de atendimento
  async function updateConversation(conversationId: string, data: any) {
    try {
      await apiPatch(`/conversations/${conversationId}`, data, token);
      await reload();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function memberName(userId: string | null) {
    if (!userId) return null;
    return team.find((m) => m.userId === userId)?.name ?? "";
  }

  function QueueChip({ conv }: { conv: any }) {
    if (!conv) return null;
    if (conv.status === "resolved") return <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700">Resolvido</span>;
    if (conv.assigneeId) return <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{memberName(conv.assigneeId)?.split(" ")[0] ?? "Em atendimento"}</span>;
    return <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Aguardando</span>;
  }

  async function restoreConversation(contactId: string) {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, conversationDeletedAt: null } : c)));
    try {
      await apiPost(`/contacts/${contactId}/conversations/restore`, {}, token);
    } catch {
      await reload();
    }
  }

  const [messageDraft, setMessageDraft] = useState("");
  const [thread, setThread] = useState<{ conversationId: string | null; channel: string; messages: any[] }>({ conversationId: null, channel: "whatsapp", messages: [] });
  const [sendNote, setSendNote] = useState("");

  // ── IA no Inbox ──
  const [aiBusy, setAiBusy] = useState<"" | "reply" | "summary" | "score">("");
  const [aiSummary, setAiSummary] = useState("");

  async function aiSuggestReply() {
    if (!selectedContact) return;
    setAiBusy("reply"); setSendNote("");
    try {
      const r = await apiPost("/ai/suggest-reply", { contactId: selectedContact.id }, token);
      if (r.note === "ai_not_configured") setSendNote("IA não configurada. Adicione ANTHROPIC_API_KEY no servidor (Configurações do Render).");
      else if (r.text) setMessageDraft(r.text);
    } catch (err: any) { setSendNote(`Falha na IA: ${err.message}`); }
    finally { setAiBusy(""); }
  }

  async function aiSummarize() {
    if (!selectedContact) return;
    setAiBusy("summary"); setAiSummary("");
    try {
      const r = await apiPost("/ai/summarize", { contactId: selectedContact.id }, token);
      setAiSummary(r.nextBestAction ? `${r.summary}\n\n👉 Próxima ação: ${r.nextBestAction}` : r.summary);
    } catch (err: any) { setAiSummary(`Falha na IA: ${err.message}`); }
    finally { setAiBusy(""); }
  }

  async function aiScore() {
    if (!selectedContact) return;
    setAiBusy("score");
    try {
      const r = await apiPost("/ai/score-lead", { contactId: selectedContact.id }, token);
      if (r.note === "ai_not_configured") setAiSummary("IA não configurada. Adicione ANTHROPIC_API_KEY no servidor.");
      else await reload();
    } catch (err: any) { setAiSummary(`Falha na IA: ${err.message}`); }
    finally { setAiBusy(""); }
  }

  function ScoreBadge({ c }: { c: any }) {
    if (c?.aiScore == null) return null;
    const color = c.aiTemperature === "quente" ? "border-red-300 bg-red-50 text-red-700"
      : c.aiTemperature === "morno" ? "border-amber-300 bg-amber-50 text-amber-700"
      : "border-sky-300 bg-sky-50 text-sky-700";
    return <span className={`rounded-full border px-2 py-0.5 text-xs ${color}`} title={c.aiScoreReason ?? ""}>IA {c.aiScore}</span>;
  }

  // Carrega o histórico de mensagens ao trocar de contato
  useEffect(() => {
    if (!selectedContact) return;
    setThread({ conversationId: null, channel: "whatsapp", messages: [] });
    apiGet(`/contacts/${selectedContact.id}/messages`, token)
      .then(setThread)
      .catch(() => {});
  }, [selectedContact?.id, token]);

  async function sendMessage() {
    const text = messageDraft.trim();
    if (!text || !selectedContact) return;
    setMessageDraft("");
    setSendNote("");

    if (thread.conversationId) {
      // conversa real existe → envia pelo canal (WhatsApp se configurado)
      const optimistic = { id: `tmp_${Date.now()}`, direction: "outbound", text, sentAt: new Date().toISOString() };
      setThread((p) => ({ ...p, messages: [...p.messages, optimistic] }));
      try {
        const r = await apiPost("/channels/send", { conversationId: thread.conversationId, channel: thread.channel, text }, token);
        if (!r.sent && r.note) setSendNote(r.note);
      } catch (err: any) {
        setSendNote(`Falha no envio: ${err.message}`);
      }
    } else {
      setSendNote("Este contato ainda não tem conversa ativa. Ela é criada quando ele manda a primeira mensagem no WhatsApp.");
    }
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const activePipeline = pipelines.find((p: any) => p.id === selectedPipelineId) ?? pipelines[0];
  const stages = activePipeline?.stages ?? [];
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [lostDealPending, setLostDealPending] = useState<{ dealId: string; stageId: string } | null>(null);
  const [lostReasonInput, setLostReasonInput] = useState("");

  async function moveDeal(dealId: string, toStageId: string, lostReason?: string) {
    const stageName = (stages.find((s: any) => s.id === toStageId)?.name ?? "").toLowerCase();
    const status = stageName.includes("ganho") ? "won" : stageName.includes("perdido") ? "lost" : "open";

    // Ao perder um negócio, pergunta o motivo (alimenta o painel do gestor)
    if (status === "lost" && lostReason === undefined) {
      setLostDealPending({ dealId, stageId: toStageId });
      setLostReasonInput("");
      return;
    }

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stageId: toStageId, status } : d)));
    try {
      await apiPatch(`/deals/${dealId}`, { stageId: toStageId, status, ...(lostReason ? { lostReason } : {}) }, token);
    } catch {
      await reload();
    }
  }

  async function deleteDeal(dealId: string) {
    if (!confirm("Excluir este negócio? Essa ação não pode ser desfeita.")) return;
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    try {
      await apiDelete(`/deals/${dealId}`, token);
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
  const analyticsSeries = series.length > 0 ? series : [{ day: "", leads: 0, wins: 0 }];

  // Exportação CSV profissional: separador ";" (padrão do Excel no Brasil, abre
  // cada dado na sua coluna), BOM para acentos corretos, cabeçalhos claros.
  function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const ptDate = (v: any) => (v ? new Date(v).toLocaleDateString("pt-BR") : "");
  const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  const channelLabel: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram" };
  const statusLabel: Record<string, string> = { open: "Aberto", won: "Ganho", lost: "Perdido" };

  function exportContacts() {
    downloadCSV(
      `solutions-contatos-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Nome do cliente", "Empresa", "Telefone", "E-mail", "Canal", "Tags", "Score IA (0-100)", "Temperatura", "Cadastrado em"],
      contacts.map((c) => [
        c.name ?? "",
        c.company ?? "",
        c.phone ?? "",
        c.email ?? "",
        channelLabel[c.conversation?.channel] ?? c.conversation?.channel ?? "",
        (c.tags ?? []).join(" | "),
        c.aiScore ?? "",
        cap(c.aiTemperature),
        ptDate(c.createdAt),
      ])
    );
  }
  function exportDeals() {
    downloadCSV(
      `solutions-negocios-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Título do negócio", "Cliente", "Empresa", "Valor (R$)", "Funil", "Etapa", "Status", "Motivo da perda", "Criado em"],
      deals.map((d) => [
        d.title ?? "",
        d.contact?.name ?? "",
        d.contact?.company ?? "",
        d.value ?? 0,
        d.pipeline?.name ?? "",
        d.stage?.name ?? "",
        statusLabel[d.status] ?? d.status ?? "",
        d.lostReason ?? "",
        ptDate(d.createdAt),
      ])
    );
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
        ? `Contato: ${selectedContact.name} (${selectedContact.company ?? "não informada"}). Última mensagem: "${selectedContact.lastMessage ?? "sem mensagens"}". Tags: ${(selectedContact.tags ?? []).join(", ") || "nenhuma"}.`
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
    <div className="app-shell relative min-h-screen overflow-x-hidden bg-slate-950">
      <TechBackground />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950/70" />
      {brand.brandColor && <div style={{ height: 4, background: brand.brandColor }} />}

      {impName && (
        <div className="relative z-20 flex items-center justify-center gap-3 bg-purple-700 px-4 py-2 text-center text-sm font-medium text-white">
          <span>🚪 Modo suporte: você está dentro da empresa <strong>{impName}</strong></span>
          <button
            onClick={() => { exitImpersonation(); window.location.reload(); }}
            className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
          >
            Sair do modo suporte
          </button>
        </div>
      )}
      {notice && !noticeHidden && (
        <div className={`relative z-20 flex items-center justify-center gap-3 px-4 py-2 text-center text-sm ${notice.level === "warning" ? "bg-amber-500 text-amber-950" : "bg-sky-600 text-white"}`}>
          <span>📢 {notice.message}</span>
          <button onClick={() => setNoticeHidden(true)} className="rounded p-0.5 hover:bg-black/10" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showPalette && (() => {
        const cmds: { label: string; view: View; manager?: boolean; ceo?: boolean }[] = [
          { label: "Início", view: "home" },
          { label: "Inbox / Conversas", view: "inbox" },
          { label: "Funil de vendas", view: "pipeline" },
          { label: "Contatos", view: "contacts" },
          { label: "Automações", view: "automations" },
          { label: "BI / Analytics", view: "analytics" },
          { label: "Copiloto de IA", view: "ai" },
          { label: "Chat da equipe", view: "comunicacao" },
          { label: "Reuniões por vídeo", view: "reunioes" },
          { label: "Suporte", view: "suporte", manager: true },
          { label: "Suporte aos clientes", view: "suporte-ceo", ceo: true },
          { label: "Gestão", view: "manager", manager: true },
          { label: "Vendedores (presença)", view: "vendedores", manager: true },
          { label: "Campanhas", view: "campaigns", manager: true },
          { label: "Templates de funil", view: "templates", manager: true },
          { label: "Configurações", view: "settings", manager: true },
          { label: "Faturamento Solutions", view: "solutions", ceo: true },
          { label: "Acessos", view: "acessos", ceo: true },
          { label: "Presença", view: "presenca", ceo: true },
        ];
        const list = cmds.filter((c) => (!c.manager || isManager) && (!c.ceo || isCeo) && c.label.toLowerCase().includes(paletteQ.toLowerCase()));
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setShowPalette(false)}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Command className="h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={paletteQ}
                  onChange={(e) => setPaletteQ(e.target.value)}
                  placeholder="Buscar tela ou ação…"
                  className="w-full bg-transparent text-sm outline-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && list[0]) { setView(list[0].view); setShowPalette(false); } }}
                />
              </div>
              <div className="max-h-80 overflow-auto p-2">
                {list.length === 0 && <div className="p-3 text-sm text-slate-500">Nada encontrado.</div>}
                {list.map((c) => (
                  <button key={c.view + c.label} onClick={() => { setView(c.view); setShowPalette(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100">
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {lostDealPending && (
        <Modal title="Motivo da perda" onClose={() => setLostDealPending(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const p = lostDealPending;
              setLostDealPending(null);
              moveDeal(p.dealId, p.stageId, lostReasonInput.trim() || "Não informado");
            }}
            className="space-y-3"
          >
            <p className="text-sm text-slate-600">Por que esse negócio foi perdido? Isso alimenta o painel do gestor.</p>
            <div className="grid gap-2">
              {["Preço", "Sem resposta", "Fechou com concorrente", "Sem orçamento", "Timing errado"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setLostReasonInput(r)}
                  className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${lostReasonInput === r ? "border-slate-900 bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input value={lostReasonInput} onChange={(e: any) => setLostReasonInput(e.target.value)} placeholder="Ou escreva outro motivo…" />
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1">Confirmar perda</Button>
              <Button variant="outline" onClick={() => setLostDealPending(null)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {planLimit && (
        <Modal title="Faça upgrade do seu plano" onClose={() => setPlanLimit(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Crown className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-600">{planLimit.note}</p>
            </div>
            <div className="flex gap-2 pt-1">
              {isManager && (
                <Button className="flex-1" onClick={() => { setPlanLimit(null); setView("settings"); }}>Ver planos</Button>
              )}
              <Button variant="outline" onClick={() => setPlanLimit(null)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}

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
              <Input required value={newDealForm.title} onChange={(e: any) => setNewDealForm((p) => ({ ...p, title: e.target.value }))} placeholder="Plano Growth - Loja Aurora" />
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

      <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img src={brand.brandLogoUrl || "/logo.jpeg"} alt={brand.brandName || "Solutions"} className="h-10 w-10 rounded-2xl object-cover ring-2 ring-white/20" />
              <h1 className="text-2xl font-semibold tracking-tight text-white">{brand.brandName || "Solutions"}</h1>
              {!brand.brandName && <span className="rounded-full border border-white/30 px-2 py-0.5 text-xs text-white/80">CRM Conversacional</span>}
            </div>
            <p className="text-sm text-slate-300">Olá, {user?.name ?? "usuário"}! Centralize WhatsApp + Instagram, funis, tarefas, automações, BI e IA.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar contatos, empresa, tags…" className="pl-9" />
            </div>
            <Button className="gap-2" onClick={() => setShowNewContact(true)}>
              <Plus className="h-4 w-4" /> Novo lead
            </Button>
            <button
              onClick={() => setShowPalette(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-2xl border border-white/30 bg-white/10 px-2 py-2 text-xs text-white hover:bg-white/20"
              title="Busca rápida (Ctrl+K)"
            >
              <Command className="h-3.5 w-3.5" /> Ctrl+K
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-2xl border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20"
              title={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleHideValues}
              className="rounded-2xl border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20"
              title={hideValues ? "Mostrar valores" : "Ocultar valores"}
            >
              {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={logout} className="rounded-2xl border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {billing?.trialDaysLeft !== null && billing?.trialDaysLeft !== undefined && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              ⏳ <strong>Teste grátis:</strong> {billing.trialDaysLeft} dia(s) restante(s).
            </span>
            {isManager && (
              <button onClick={() => setView("settings")} className="rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">
                Ver planos
              </button>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <Card>
            <CardHeader>
              <div className="text-base font-semibold">Navegação</div>
              <div className="text-sm text-slate-500">{user?.email}</div>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Atendimento</div>
              <NavItem icon={<Home className="h-4 w-4" />} active={view === "home"} onClick={() => setView("home")} label="Início" />
              <NavItem icon={<MessageSquare className="h-4 w-4" />} active={view === "inbox"} onClick={() => setView("inbox")} label="Inbox" />
              <NavItem icon={<Users className="h-4 w-4" />} active={view === "contacts"} onClick={() => setView("contacts")} label="Contatos" />

              <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vendas</div>
              <NavItem icon={<KanbanSquare className="h-4 w-4" />} active={view === "pipeline"} onClick={() => setView("pipeline")} label="Funil" />
              {isManager && <NavItem icon={<Megaphone className="h-4 w-4 text-orange-500" />} active={view === "campaigns"} onClick={() => setView("campaigns")} label="Campanhas" />}
              {isManager && <NavItem icon={<Sparkles className="h-4 w-4 text-sky-500" />} active={view === "templates"} onClick={() => setView("templates")} label="Templates" />}

              <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inteligência</div>
              <NavItem icon={<Sparkles className="h-4 w-4" />} active={view === "ai"} onClick={() => setView("ai")} label="Copiloto IA" />
              {isManager && <NavItem icon={<Bot className="h-4 w-4 text-sky-500" />} active={view === "flows"} onClick={() => setView("flows")} label="Fluxos da IA" />}
              <NavItem icon={<Zap className="h-4 w-4" />} active={view === "automations"} onClick={() => setView("automations")} label="Automações" />
              <NavItem icon={<LineChartIcon className="h-4 w-4" />} active={view === "analytics"} onClick={() => setView("analytics")} label="BI / Relatórios" />

              <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Comunicação</div>
              <NavItem icon={<MessagesSquare className="h-4 w-4 text-teal-500" />} active={view === "comunicacao"} onClick={() => setView("comunicacao")} label="Chat da equipe" />
              <NavItem icon={<Video className="h-4 w-4 text-rose-500" />} active={view === "reunioes"} onClick={() => setView("reunioes")} label="Reuniões (vídeo)" />
              {isManager && <NavItem icon={<LifeBuoy className="h-4 w-4 text-sky-500" />} active={view === "suporte"} onClick={() => setView("suporte")} label="Suporte" />}

              {isManager && (
                <>
                  <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</div>
                  <NavItem icon={<Crown className="h-4 w-4 text-amber-500" />} active={view === "manager"} onClick={() => setView("manager")} label="Painel do gestor" />
                  <NavItem icon={<UserCheck className="h-4 w-4 text-emerald-500" />} active={view === "vendedores"} onClick={() => setView("vendedores")} label="Vendedores" />
                  <NavItem icon={<SettingsIcon className="h-4 w-4" />} active={view === "settings"} onClick={() => setView("settings")} label="Configurações" />
                </>
              )}

              {isCeo && (
                <>
                  <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-purple-400">Plataforma</div>
                  <NavItem icon={<Building2 className="h-4 w-4 text-purple-500" />} active={view === "solutions"} onClick={() => setView("solutions")} label="Faturamento Solutions" />
                  <NavItem icon={<Users className="h-4 w-4 text-purple-500" />} active={view === "acessos"} onClick={() => setView("acessos")} label="Acessos" />
                  <NavItem icon={<UserCheck className="h-4 w-4 text-purple-500" />} active={view === "presenca"} onClick={() => setView("presenca")} label="Presença" />
                  <NavItem icon={<LifeBuoy className="h-4 w-4 text-purple-500" />} active={view === "suporte-ceo"} onClick={() => setView("suporte-ceo")} label="Suporte aos clientes" />
                </>
              )}

              <div className="my-3 h-px bg-slate-200" />
              <div className="grid gap-2">
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-slate-500">Pipeline aberto</div>
                  <div className="mt-1 text-base font-semibold">{money(kpis?.pipelineValue ?? pipelineValue)}</div>
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
            {/* ── HOME ── */}
            {view === "home" && (
              <HomeView
                user={user}
                kpis={kpis}
                contacts={contacts}
                deals={deals}
                tasks={tasks}
                money={money}
                onGo={(v) => setView(v as View)}
                onSelectContact={(id) => setSelectedContactId(id)}
              />
            )}

            {/* ── INBOX ── */}
            {view === "inbox" && (
              <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold">Conversas</div>
                      <div className="relative">
                        <Button variant="outline" className="gap-2" onClick={() => setShowFilters((p: boolean) => !p)}>
                          <Filter className="h-4 w-4" /> Filtros {channelFilter !== "all" && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                        </Button>
                        {showFilters && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-2xl border bg-white p-2 shadow-lg">
                            <div className="px-2 pb-1 text-xs font-medium text-slate-500">Canal</div>
                            {([["all", "Todos"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"]] as const).map(([v, label]) => (
                              <button
                                key={v}
                                onClick={() => { setChannelFilter(v); setShowFilters(false); }}
                                className={`block w-full rounded-xl px-2 py-1.5 text-left text-sm transition ${channelFilter === v ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
                              >
                                {label}
                              </button>
                            ))}
                            {isManager && (
                              <>
                                <div className="my-1 h-px bg-slate-200" />
                                <div className="px-2 pb-1 text-xs font-medium text-slate-500">Pasta</div>
                                {([["active", "Caixa de entrada"], ["deleted", "🗑️ Apagados"]] as const).map(([v, label]) => (
                                  <button
                                    key={v}
                                    onClick={() => { setInboxFolder(v); setShowFilters(false); }}
                                    className={`block w-full rounded-xl px-2 py-1.5 text-left text-sm transition ${inboxFolder === v ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {inboxFolder === "deleted" ? `🗑️ Apagados: ${filteredContacts.length}` : `${filteredContacts.length} de ${contacts.filter((c) => !c.conversationDeletedAt).length} conversas`}
                      {channelFilter !== "all" && ` • ${channelFilter === "whatsapp" ? "WhatsApp" : "Instagram"}`}
                      {(channelFilter !== "all" || inboxFolder === "deleted") && (
                        <button onClick={() => { setChannelFilter("all"); setInboxFolder("active"); }} className="ml-2 text-xs text-blue-600 underline">
                          limpar filtros
                        </button>
                      )}
                    </div>
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
                            <div key={c.id} onClick={() => setSelectedContactId(c.id)} role="button" tabIndex={0}
                              className={`w-full cursor-pointer rounded-2xl border p-3 text-left transition ${c.id === (selectedContact?.id) ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate font-medium">{c.name}</span>
                                    {(c.conversation?.channel || c.channel) && <ChannelBadge c={c.conversation?.channel ?? c.channel} />}
                                    <QueueChip conv={c.conversation} />
                                    <ScoreBadge c={c} />
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span className="truncate">{c.company ?? ""}</span>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="text-xs text-slate-400">{c.phone ?? ""}</span>
                                  {isManager && (inboxFolder === "deleted" ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); restoreConversation(c.id); }}
                                      className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50"
                                      title="Restaurar conversa"
                                    >
                                      Restaurar
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteConversation(c.id, c.name); }}
                                      className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                                      title="Excluir conversa (só gestor)"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {c.lastMessage && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.lastMessage}</p>}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(c.tags ?? []).slice(0, 3).map((t: string) => (
                                  <Pill key={t}><span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {t}</span></Pill>
                                ))}
                              </div>
                            </div>
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
                        <div className="truncate text-sm text-slate-500">
                          {selectedContact?.company ?? ""}
                          {selectedContact?.conversation?.assigneeId && ` • Atendente: ${memberName(selectedContact.conversation.assigneeId)}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {selectedContact?.conversation && (
                          <>
                            {selectedContact.conversation.status !== "resolved" && selectedContact.conversation.assigneeId !== user?.id && (
                              <Button variant="outline" className="gap-1 px-2 py-1 text-xs" onClick={() => updateConversation(selectedContact.conversation.id, { assigneeId: user?.id })}>
                                <UserCheck className="h-3.5 w-3.5" /> Assumir
                              </Button>
                            )}
                            {selectedContact.conversation.status !== "resolved" ? (
                              <Button variant="outline" className="gap-1 px-2 py-1 text-xs" onClick={() => updateConversation(selectedContact.conversation.id, { status: "resolved" })}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                              </Button>
                            ) : (
                              <Button variant="outline" className="gap-1 px-2 py-1 text-xs" onClick={() => updateConversation(selectedContact.conversation.id, { status: "open" })}>
                                Reabrir
                              </Button>
                            )}
                          </>
                        )}
                        {selectedContact?.channel && <ChannelBadge c={selectedContact.conversation?.channel ?? selectedContact.channel} />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border p-3">
                      <div className="h-[340px] overflow-auto pr-1">
                        {thread.messages.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Nenhuma mensagem ainda. O histórico aparece aqui quando o contato mandar mensagem pelo WhatsApp/Instagram conectado.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {thread.messages.map((m: any) => (
                              <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl border px-3 py-2 ${m.direction === "outbound" ? "bg-slate-900 text-white" : "bg-white"}`}>
                                  <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                                  <div className={`mt-1 text-xs ${m.direction === "outbound" ? "text-slate-300" : "text-slate-400"}`}>
                                    {new Date(m.sentAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedContact && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" className="gap-1 px-2 py-1 text-xs" onClick={aiSuggestReply} disabled={aiBusy !== ""}>
                          <Sparkles className="h-3.5 w-3.5 text-violet-500" /> {aiBusy === "reply" ? "Gerando…" : "Sugerir resposta"}
                        </Button>
                        <Button variant="outline" className="gap-1 px-2 py-1 text-xs" onClick={aiSummarize} disabled={aiBusy !== ""}>
                          <Sparkles className="h-3.5 w-3.5 text-violet-500" /> {aiBusy === "summary" ? "Resumindo…" : "Resumir"}
                        </Button>
                        <Button variant="outline" className="gap-1 px-2 py-1 text-xs" onClick={aiScore} disabled={aiBusy !== ""}>
                          <Sparkles className="h-3.5 w-3.5 text-violet-500" /> {aiBusy === "score" ? "Analisando…" : "Analisar lead"}
                        </Button>
                        <ScoreBadge c={selectedContact} />
                      </div>
                    )}
                    {aiSummary && (
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 whitespace-pre-wrap">
                        {aiSummary}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Textarea value={messageDraft} onChange={(e: any) => setMessageDraft(e.target.value)} placeholder="Escreva uma resposta…" className="min-h-[44px]" />
                      <Button onClick={sendMessage} disabled={!selectedContact} className="h-[44px]">
                        <Send className="h-4 w-4" /> Enviar
                      </Button>
                    </div>
                    {sendNote && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{sendNote}</div>}

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
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    {pipelines.length > 1 ? (
                      <select
                        value={activePipeline?.id ?? ""}
                        onChange={(e) => setSelectedPipelineId(e.target.value)}
                        className="rounded-2xl border px-3 py-1.5 text-base font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {pipelines.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    ) : (
                      <h2 className="text-base font-semibold">{activePipeline?.name ?? "Funil"}</h2>
                    )}
                    <p className="text-sm text-slate-500">{deals.filter((d) => stages.some((s: any) => s.id === d.stageId)).length} negócios neste funil</p>
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
                              <div className="text-sm text-slate-500">{money(stageDeals.reduce((a, d) => a + (d.value ?? 0), 0))}</div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {stageDeals.map((d) => (
                                <div
                                  key={d.id}
                                  draggable
                                  onDragStart={(e) => e.dataTransfer.setData("dealId", d.id)}
                                  className="cursor-grab rounded-2xl border p-3 transition hover:shadow-md active:cursor-grabbing"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium text-sm">{d.title}</div>
                                    <button onClick={() => deleteDeal(d.id)} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Excluir negócio">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">{money(d.value ?? 0)}{d.contact?.name ? ` • ${d.contact.name}` : ""}</div>
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
                                <span className="truncate">{c.company ?? ""}</span>
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
              <AutomationsView token={token} automations={automations} onChanged={reload} />
            )}

            {/* ── FLUXOS DA IA (no-code) ── */}
            {view === "flows" && <FlowsView token={token} />}

            {/* ── CAMPAIGNS ── */}
            {view === "campaigns" && <CampaignsView token={token} contacts={contacts} />}

            {/* ── ANALYTICS ── */}
            {view === "analytics" && (() => {
              const won = deals.filter((d) => /ganho/i.test(d.stage?.name ?? ""));
              const wonValue = won.reduce((a, d) => a + (d.value ?? 0), 0);
              const conv = deals.length ? Math.round((won.length / deals.length) * 100) : 0;
              const ticket = won.length ? wonValue / won.length : 0;
              const byStage = Object.entries(
                deals.reduce((acc: Record<string, number>, d) => { const k = d.stage?.name ?? "(sem etapa)"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
              ).map(([etapa, qtd]) => ({ etapa, qtd }));
              const chartTooltip = { borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 6px 20px rgba(15,23,42,0.1)", fontSize: 12, padding: "8px 12px" } as const;
              return (
              <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">BI / Relatórios</div>
                    <div className="text-sm text-slate-500">Dados reais da sua organização</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <KPI title="Leads (total)" value={kpis?.leads ?? contacts.length} hint="Contatos cadastrados" />
                      <KPI title="Negócios abertos" value={kpis?.openDeals ?? deals.filter((d) => d.status === "open").length} hint="No funil ativo" />
                      <KPI title="Pipeline" value={money(kpis?.pipelineValue ?? pipelineValue)} hint="Valor em aberto" />
                      <KPI title="Ganhos" value={won.length} hint={money(wonValue)} />
                      <KPI title="Conversão" value={`${conv}%`} hint="Ganhos / total de negócios" />
                      <KPI title="Ticket médio" value={money(ticket)} hint="Por negócio ganho" />
                    </div>
                    <div className="my-4 h-px bg-slate-200" />
                    <div className="mb-2 text-sm font-medium text-slate-700">Leads e ganhos na semana</div>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gWins" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.32} />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#eef2f7" />
                          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={6} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={chartTooltip} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                          <Area type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gLeads)" dot={false} activeDot={{ r: 4 }} />
                          <Area type="monotone" dataKey="wins" name="Ganhos" stroke="#22c55e" strokeWidth={2.5} fill="url(#gWins)" dot={false} activeDot={{ r: 4 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="my-4 h-px bg-slate-200" />
                    <div className="mb-2 text-sm font-medium text-slate-700">Negócios por etapa</div>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byStage} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#eef2f7" />
                          <XAxis dataKey="etapa" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} interval={0} dy={6} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={chartTooltip} cursor={{ fill: "#f1f5f9" }} />
                          <Bar dataKey="qtd" name="Negócios" fill="url(#gBar)" radius={[6, 6, 0, 0]} maxBarSize={52} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Exportar dados</div>
                    <div className="text-sm text-slate-500">Baixe em CSV (abre no Excel)</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full" onClick={exportContacts}>Exportar contatos (CSV)</Button>
                    <Button variant="outline" className="w-full" onClick={exportDeals}>Exportar negócios (CSV)</Button>
                    <div className="h-px bg-slate-200" />
                    <MiniStat label="Contatos" value={kpis?.leads ?? contacts.length} />
                    <MiniStat label="Tarefas abertas" value={kpis?.tasksOpen ?? tasks.filter((t) => t.status === "open").length} />
                    <MiniStat label="Negócios" value={deals.length} />
                    <MiniStat label="Negócios ganhos" value={won.length} />
                  </CardContent>
                </Card>
              </div>
              );
            })()}

            {/* ── MANAGER ── */}
            {view === "manager" && <ManagerView token={token} hideValues={hideValues} />}

            {/* ── PLATAFORMA (CEO) ── */}
            {view === "solutions" && isCeo && <FaturamentoSolutions token={token} hideValues={hideValues} />}
            {view === "acessos" && isCeo && <AcessosView token={token} />}
            {view === "presenca" && isCeo && <PresencaView token={token} />}

            {/* ── TEMPLATES (Vendas) ── */}
            {view === "templates" && isManager && <TemplatesView token={token} />}

            {/* ── VENDEDORES (presença, gestor) ── */}
            {view === "vendedores" && isManager && <VendedoresView token={token} />}

            {/* ── COMUNICAÇÃO (chat) ── */}
            {view === "comunicacao" && <ComunicacaoView token={token} />}
            {view === "reunioes" && <ReunioesView token={token} isManager={isManager} />}
            {view === "suporte" && isManager && <SuporteView token={token} />}
            {view === "suporte-ceo" && isCeo && <SuporteCeoView token={token} />}

            {/* ── SETTINGS ── */}
            {view === "settings" && <SettingsView token={token} isManager={isManager} />}

            {/* ── AI ── */}
            {view === "ai" && <CopilotView token={token} />}
          </div>
        </div>
      </div>
    </div>
  );
}
