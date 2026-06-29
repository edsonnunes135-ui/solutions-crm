import React, { useState } from "react";
import { TrendingUp, Flame, ListTodo, Users, KanbanSquare, Rocket, X, ArrowRight, ArrowUpRight, MessageSquare, Sparkles } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

interface Props {
  user: any;
  kpis: any;
  contacts: any[];
  deals: any[];
  tasks: any[];
  series: { day: string; leads: number; wins: number }[];
  money: (v: number) => string;
  onGo: (view: string) => void;
  onSelectContact: (id: string) => void;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
      <div className="mb-1 font-medium text-slate-500 dark:text-slate-400">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-700 dark:text-slate-200">{p.dataKey === "leads" ? "Leads" : "Ganhos"}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

export default function HomeView({ user, kpis, contacts, deals, tasks, series, money, onGo, onSelectContact }: Props) {
  const pipelineValue = deals.filter((d) => d.status === "open").reduce((a, d) => a + (d.value ?? 0), 0);

  // IA prioriza: leads por score de IA, senão por tag "Quente"
  const hotLeads = [...contacts]
    .filter((c) => !c.conversationDeletedAt)
    .map((c) => ({ ...c, _rank: c.aiScore ?? ((c.tags ?? []).some((t: string) => /quente/i.test(t)) ? 80 : 0) }))
    .filter((c) => c._rank > 0)
    .sort((a, b) => b._rank - a._rank)
    .slice(0, 5);

  const openTasks = tasks.filter((t) => t.status === "open").slice(0, 5);

  const data = series && series.length > 0 ? series : [{ day: "", leads: 0, wins: 0 }];
  const leads7 = data.reduce((s, d) => s + (d.leads || 0), 0);
  const wins7 = data.reduce((s, d) => s + (d.wins || 0), 0);

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
    { label: "Leads", value: kpis?.leads ?? contacts.length, sub: leads7 > 0 ? `+${leads7} em 7 dias` : "—", icon: <Users className="h-4 w-4" />, ring: "text-blue-600 bg-blue-50 dark:bg-blue-500/10", go: "contacts" },
    { label: "Negócios abertos", value: kpis?.openDeals ?? deals.filter((d) => d.status === "open").length, sub: "no funil", icon: <KanbanSquare className="h-4 w-4" />, ring: "text-violet-600 bg-violet-50 dark:bg-violet-500/10", go: "pipeline" },
    { label: "Pipeline", value: money(kpis?.pipelineValue ?? pipelineValue), sub: "em aberto", icon: <TrendingUp className="h-4 w-4" />, ring: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10", go: "pipeline" },
    { label: "Ganhos", value: wins7, sub: "fechados em 7 dias", icon: <ArrowUpRight className="h-4 w-4" />, ring: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", go: "pipeline" },
  ];

  return (
    <div className="space-y-4">
      {/* Cabeçalho — banner com leve gradiente */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-sm dark:border-slate-700">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xl font-bold tracking-tight">Olá, {user?.name?.split(" ")[0] ?? "vendedor"} 👋</div>
            <div className="mt-0.5 truncate text-xs capitalize text-slate-300">{today}</div>
          </div>
          <button onClick={() => onGo("inbox")} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-white">
            <MessageSquare className="h-4 w-4" /> Abrir Inbox
          </button>
        </div>
      </div>

      {showOnboarding && (
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-500/30 dark:bg-sky-500/10">
          <Rocket className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-sky-900 dark:text-sky-200">Primeiros passos · {doneCount}/{steps.length}</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {steps.filter((s) => !s.done).map((s) => (
                <button key={s.label} onClick={() => onGo(s.go)} className="rounded-full border border-sky-300 bg-white px-2 py-0.5 text-xs text-sky-800 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-slate-800 dark:text-sky-200">{s.label}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { localStorage.setItem("solutions_onboarding_done", "1"); setHideOnboarding(true); }} className="shrink-0 rounded-lg p-1 text-sky-700 hover:bg-sky-100 dark:text-sky-300" title="Dispensar"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* KPIs — tiles calmos e clicáveis */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <button key={k.label} onClick={() => onGo(k.go)} className="group rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.ring}`}>{k.icon}</span>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />
            </div>
            <div className="mt-2.5 truncate text-2xl font-bold leading-tight text-slate-900 dark:text-white">{k.value}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">{k.label}</span>
              <span className="text-slate-400 dark:text-slate-500">· {k.sub}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Gráfico (centro) + Prioridades da IA (lateral) */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Atividade — área com gradiente */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Atividade · últimos 7 dias</div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Leads <strong className="text-slate-700 dark:text-slate-200">{leads7}</strong></span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ganhos <strong className="text-slate-700 dark:text-slate-200">{wins7}</strong></span>
            </div>
          </div>
          <div className="mt-3 h-[208px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={6} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#gLeads)" />
                <Area type="monotone" dataKey="wins" stroke="#10b981" strokeWidth={2.5} fill="url(#gWins)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prioridades da IA */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><Sparkles className="h-4 w-4 text-indigo-500" /> Prioridades da IA</div>
            <button onClick={() => onGo("contacts")} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">ver todos</button>
          </div>
          <div className="max-h-[210px] space-y-1.5 overflow-auto px-3 pb-3">
            {hotLeads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Sem leads priorizados. Use <strong>Analisar lead</strong> no Inbox para a IA pontuar seus contatos.</div>
            ) : (
              hotLeads.map((c) => (
                <button key={c.id} onClick={() => { onSelectContact(c.id); onGo("inbox"); }} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 p-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <div className="flex min-w-0 items-center gap-2">
                    <Flame className={`h-4 w-4 shrink-0 ${c.aiTemperature === "morno" ? "text-amber-500" : c.aiTemperature === "frio" ? "text-sky-500" : "text-red-500"}`} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{c.company ?? c.phone ?? ""}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${c.aiTemperature === "morno" ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10" : c.aiTemperature === "frio" ? "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-500/10" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10"}`}>
                    {c.aiScore != null ? c.aiScore : "•"}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tarefas de hoje */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><ListTodo className="h-4 w-4 text-amber-500" /> Tarefas de hoje</div>
          <button onClick={() => onGo("inbox")} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">abrir <ArrowRight className="h-3 w-3" /></button>
        </div>
        <div className="grid gap-1.5 px-3 pb-3 sm:grid-cols-2">
          {openTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500 sm:col-span-2 dark:border-slate-700 dark:text-slate-400">Nenhuma tarefa aberta. 🎉</div>
          ) : (
            openTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                <span className="truncate text-sm text-slate-700 dark:text-slate-200">{t.title}</span>
                <span className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-xs ${t.priority === "high" ? "border-red-300 text-red-700 dark:text-red-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{t.priority === "high" ? "Alta" : t.priority === "medium" ? "Média" : "Baixa"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
