import React, { useState } from "react";
import { TrendingUp, Flame, ListTodo, Users, KanbanSquare, Rocket, X, ArrowRight, MessageSquare } from "lucide-react";

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
    .slice(0, 6);

  const openTasks = tasks.filter((t) => t.status === "open").slice(0, 6);

  // Onboarding guiado (1º acesso), dispensável
  const [hideOnboarding, setHideOnboarding] = useState(() => localStorage.getItem("solutions_onboarding_done") === "1");
  const steps = [
    { done: contacts.length > 0, label: "Adicione seu primeiro contato", go: "contacts" },
    { done: contacts.some((c) => c.conversation), label: "Conecte um canal (WhatsApp/Instagram)", go: "settings" },
    { done: deals.length > 0, label: "Crie um negócio no funil", go: "pipeline" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const showOnboarding = !hideOnboarding && doneCount < steps.length;

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const kpiCards = [
    { label: "Leads", value: kpis?.leads ?? contacts.length, icon: <Users className="h-4 w-4 text-blue-600" />, tint: "bg-blue-50", go: "contacts" },
    { label: "Negócios", value: kpis?.openDeals ?? deals.filter((d) => d.status === "open").length, icon: <KanbanSquare className="h-4 w-4 text-violet-600" />, tint: "bg-violet-50", go: "pipeline" },
    { label: "Pipeline", value: money(kpis?.pipelineValue ?? pipelineValue), icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, tint: "bg-emerald-50", go: "pipeline" },
    { label: "Tarefas", value: kpis?.tasksOpen ?? openTasks.length, icon: <ListTodo className="h-4 w-4 text-amber-600" />, tint: "bg-amber-50", go: "inbox" },
  ];

  return (
    <div className="space-y-4">
      {/* Cabeçalho compacto: saudação + uma única ação principal */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xl font-bold tracking-tight">Olá, {user?.name?.split(" ")[0] ?? "vendedor"}! 👋</div>
          <div className="truncate text-xs capitalize text-slate-500">{today}</div>
        </div>
        <button onClick={() => onGo("inbox")} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
          <MessageSquare className="h-4 w-4" /> Abrir Inbox
        </button>
      </div>

      {showOnboarding && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
          <Rocket className="h-4 w-4 shrink-0 text-sky-700" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-sky-900">Primeiros passos · {doneCount}/{steps.length}</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {steps.filter((s) => !s.done).map((s) => (
                <button key={s.label} onClick={() => onGo(s.go)} className="rounded-full border border-sky-300 bg-white px-2 py-0.5 text-xs text-sky-800 hover:bg-sky-100">{s.label}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { localStorage.setItem("solutions_onboarding_done", "1"); setHideOnboarding(true); }} className="shrink-0 rounded-lg p-1 text-sky-700 hover:bg-sky-100" title="Dispensar"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* KPIs — fileira compacta e clicável (são os atalhos principais) */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <button key={k.label} onClick={() => onGo(k.go)} className="flex items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-sm">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${k.tint}`}>{k.icon}</span>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">{k.label}</div>
              <div className="truncate text-lg font-bold leading-tight">{k.value}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Listas lado a lado, com altura limitada (sem rolar a página inteira) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-red-500" /> Leads quentes</div>
            <button onClick={() => onGo("contacts")} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">ver todos <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="max-h-[260px] space-y-1.5 overflow-auto px-3 pb-3">
            {hotLeads.length === 0 ? (
              <div className="rounded-xl border border-dashed p-3 text-xs text-slate-500">Nenhum lead quente ainda. Use <strong>Analisar lead</strong> no Inbox para a IA pontuar seus contatos.</div>
            ) : (
              hotLeads.map((c) => (
                <button key={c.id} onClick={() => { onSelectContact(c.id); onGo("inbox"); }} className="flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-slate-500">{c.company ?? c.phone ?? ""}</div>
                  </div>
                  {c.aiScore != null ? (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${c.aiTemperature === "quente" ? "border-red-300 bg-red-50 text-red-700" : c.aiTemperature === "morno" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-sky-300 bg-sky-50 text-sky-700"}`}>IA {c.aiScore}</span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700">Quente</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold"><ListTodo className="h-4 w-4 text-amber-500" /> Tarefas de hoje</div>
            <button onClick={() => onGo("inbox")} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">abrir <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="max-h-[260px] space-y-1.5 overflow-auto px-3 pb-3">
            {openTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-3 text-xs text-slate-500">Nenhuma tarefa aberta. 🎉</div>
            ) : (
              openTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border p-2.5">
                  <span className="truncate text-sm">{t.title}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${t.priority === "high" ? "border-red-300 text-red-700" : "text-slate-600"}`}>{t.priority === "high" ? "Alta" : t.priority === "medium" ? "Média" : "Baixa"}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
