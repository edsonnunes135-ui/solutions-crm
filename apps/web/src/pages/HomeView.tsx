import React, { useState } from "react";
import { TrendingUp, Flame, ListTodo, Users, KanbanSquare, Rocket, Check, X, MessageSquare, Bot, ArrowRight } from "lucide-react";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}

interface Props {
  user: any;
  kpis: any;
  contacts: any[];
  deals: any[];
  tasks: any[];
  money: (v: number) => string;
  onGo: (view: string) => void;
  onSelectContact: (id: string) => void;
}

export default function HomeView({ user, kpis, contacts, deals, tasks, money, onGo, onSelectContact }: Props) {
  const pipelineValue = deals.filter((d) => d.status === "open").reduce((a, d) => a + (d.value ?? 0), 0);

  // leads quentes: por score de IA, senão por tag "Quente"
  const hotLeads = [...contacts]
    .filter((c) => !c.conversationDeletedAt)
    .map((c) => ({ ...c, _rank: c.aiScore ?? ((c.tags ?? []).some((t: string) => /quente/i.test(t)) ? 80 : 0) }))
    .filter((c) => c._rank > 0)
    .sort((a, b) => b._rank - a._rank)
    .slice(0, 5);

  const openTasks = tasks.filter((t) => t.status === "open").slice(0, 6);

  // Onboarding guiado (1º acesso), dispensável
  const [hideOnboarding, setHideOnboarding] = useState(() => localStorage.getItem("solutions_onboarding_done") === "1");
  const steps = [
    { done: contacts.length > 0, label: "Adicione seu primeiro contato", go: "contacts" },
    { done: contacts.some((c) => c.conversation), label: "Conecte um canal (WhatsApp/Instagram) em Configurações", go: "settings" },
    { done: deals.length > 0, label: "Crie um negócio no funil", go: "pipeline" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const showOnboarding = !hideOnboarding && doneCount < steps.length;

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const kpiCards = [
    { label: "Leads", value: kpis?.leads ?? contacts.length, icon: <Users className="h-5 w-5 text-blue-600" />, tint: "bg-blue-50", go: "contacts" },
    { label: "Negócios abertos", value: kpis?.openDeals ?? deals.filter((d) => d.status === "open").length, icon: <KanbanSquare className="h-5 w-5 text-violet-600" />, tint: "bg-violet-50", go: "pipeline" },
    { label: "Pipeline", value: money(kpis?.pipelineValue ?? pipelineValue), icon: <TrendingUp className="h-5 w-5 text-emerald-600" />, tint: "bg-emerald-50", go: "pipeline" },
    { label: "Tarefas abertas", value: kpis?.tasksOpen ?? openTasks.length, icon: <ListTodo className="h-5 w-5 text-amber-600" />, tint: "bg-amber-50", go: "inbox" },
  ];

  const quickActions = [
    { label: "Inbox", icon: <MessageSquare className="h-4 w-4 text-sky-600" />, go: "inbox" },
    { label: "Contatos", icon: <Users className="h-4 w-4 text-blue-600" />, go: "contacts" },
    { label: "Funil", icon: <KanbanSquare className="h-4 w-4 text-violet-600" />, go: "pipeline" },
    { label: "Fluxos da IA", icon: <Bot className="h-4 w-4 text-sky-600" />, go: "flows" },
  ];

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold tracking-tight">Olá, {user?.name?.split(" ")[0] ?? "vendedor"}! 👋</div>
          <div className="text-sm capitalize text-slate-500">{today}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {quickActions.map((a) => (
            <button key={a.label} onClick={() => onGo(a.go)} className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:shadow-sm">
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>

      {showOnboarding && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 font-semibold text-sky-900">
              <Rocket className="h-5 w-5" /> Primeiros passos ({doneCount}/{steps.length})
            </div>
            <button onClick={() => { localStorage.setItem("solutions_onboarding_done", "1"); setHideOnboarding(true); }} className="rounded-lg p-1 text-sky-700 hover:bg-sky-100" title="Dispensar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {steps.map((s) => (
              <button key={s.label} onClick={() => onGo(s.go)} disabled={s.done} className={`flex w-full items-center gap-2 rounded-xl border bg-white p-2 text-left text-sm ${s.done ? "opacity-60" : "hover:bg-slate-50"}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${s.done ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>
                  {s.done && <Check className="h-3 w-3" />}
                </span>
                <span className={s.done ? "text-slate-500 line-through" : ""}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <button key={k.label} onClick={() => onGo(k.go)} className="group rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.tint}`}>{k.icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{k.label}</div>
                <div className="truncate text-2xl font-bold leading-tight">{k.value}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold"><Flame className="h-5 w-5 text-red-500" /> Leads quentes para hoje</div>
            <button onClick={() => onGo("contacts")} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">ver todos <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="space-y-2 p-4 pt-0">
            {hotLeads.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">
                Nenhum lead quente ainda. Use <strong>Analisar lead</strong> no Inbox para a IA pontuar seus contatos.
              </div>
            ) : (
              hotLeads.map((c) => (
                <button key={c.id} onClick={() => { onSelectContact(c.id); onGo("inbox"); }} className="flex w-full items-center justify-between rounded-2xl border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-slate-500">{c.company ?? c.phone ?? ""}</div>
                  </div>
                  {c.aiScore != null ? (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${c.aiTemperature === "quente" ? "border-red-300 bg-red-50 text-red-700" : c.aiTemperature === "morno" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-sky-300 bg-sky-50 text-sky-700"}`}>
                      IA {c.aiScore}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700">Quente</span>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold"><ListTodo className="h-5 w-5 text-amber-500" /> Tarefas de hoje</div>
            <button onClick={() => onGo("inbox")} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">abrir <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="space-y-2 p-4 pt-0">
            {openTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">Nenhuma tarefa aberta. 🎉</div>
            ) : (
              openTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl border p-3">
                  <span className="truncate text-sm">{t.title}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${t.priority === "high" ? "border-red-300 text-red-700" : "text-slate-600"}`}>
                    {t.priority === "high" ? "Alta" : t.priority === "medium" ? "Média" : "Baixa"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
