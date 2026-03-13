import React, { useMemo, useState } from "react";
import {
  MessageSquare,
  Users,
  KanbanSquare,
  Zap,
  LineChart as LineChartIcon,
  Sparkles,
  Search,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Tag,
  Building2,
  Phone,
  Instagram,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { apiGet, apiPatch, apiPost } from "./lib/api";

type View = "inbox" | "pipeline" | "contacts" | "automations" | "analytics" | "ai";

const stages = [
  { id: "new", name: "Novo" },
  { id: "qual", name: "Qualificando" },
  { id: "prop", name: "Proposta" },
  { id: "won", name: "Ganho" },
  { id: "lost", name: "Perdido" },
];

const seedContacts = [
  {
    id: "c1",
    name: "Ana Martins",
    company: "Loja Aurora",
    phone: "+55 21 9xxxx-xxxx",
    channel: "whatsapp" as const,
    tags: ["Quente", "Varejo"],
    lastMessage: "Qual o prazo de entrega e forma de pagamento?",
    lastAt: "há 12 min",
  },
  {
    id: "c2",
    name: "Bruno Lima",
    company: "B2B Serras",
    phone: "+55 85 9xxxx-xxxx",
    channel: "instagram" as const,
    tags: ["Inbound"],
    lastMessage: "Consegue mandar uma proposta hoje?",
    lastAt: "há 1 h",
  },
];

const seedDeals = [
  { id: "d1", title: "Plano Growth - Loja Aurora", value: 4800, stageId: "qual", owner: "Edson" },
  { id: "d2", title: "Implantação CRM - B2B Serras", value: 12500, stageId: "prop", owner: "Edson" },
];

const seedTasks = [
  { id: "t1", title: "Follow-up proposta (Bruno)", due: "Hoje 17:00", status: "open" as const, priority: "high" as const },
  { id: "t2", title: "Enviar catálogo (Ana)", due: "Hoje 15:30", status: "open" as const, priority: "medium" as const },
];

function currencyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border px-2 py-0.5 text-xs text-slate-600">{children}</span>;
}

function Button({ children, onClick, variant = "solid", className = "", disabled = false }: any) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition";
  const solid = "bg-slate-900 text-white hover:bg-slate-800";
  const outline = "border bg-white hover:bg-slate-50";
  return (
    <button disabled={disabled} onClick={onClick} className={`${base} ${variant === "outline" ? outline : solid} ${disabled ? "opacity-50" : ""} ${className}`}>
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

function Input({ value, onChange, placeholder, className = "" }: any) {
  return <input value={value} onChange={onChange} placeholder={placeholder} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${className}`} />;
}

function Textarea({ value, onChange, placeholder, className = "" }: any) {
  return <textarea value={value} onChange={onChange} placeholder={placeholder} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${className}`} />;
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-slate-400">›</span>
    </button>
  );
}

function PriorityPill({ p }: { p: "low" | "medium" | "high" }) {
  const label = p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa";
  const icon = p === "high" ? <AlertCircle className="h-4 w-4" /> : p === "medium" ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />;
  const cls = p === "high" ? "border-red-300 text-red-700" : "border-slate-200 text-slate-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {icon} {label}
    </span>
  );
}

function ChannelBadge({ c }: { c: "whatsapp" | "instagram" }) {
  return c === "whatsapp" ? (
    <Pill>
      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> WhatsApp</span>
    </Pill>
  ) : (
    <Pill>
      <span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram</span>
    </Pill>
  );
}

export default function App() {
  const [view, setView] = useState<View>("inbox");
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState(seedContacts);
  const [deals, setDeals] = useState(seedDeals);
  const [tasks, setTasks] = useState(seedTasks);
  const [selectedContactId, setSelectedContactId] = useState(seedContacts[0].id);

  const selectedContact = useMemo(() => contacts.find((c) => c.id === selectedContactId) ?? contacts[0], [contacts, selectedContactId]);
  const filteredContacts = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return contacts;
    return contacts.filter((c) => [c.name, c.company, c.phone, c.lastMessage, c.tags.join(" ")].join(" ").toLowerCase().includes(t));
  }, [contacts, q]);

  const pipelineValue = useMemo(() => deals.filter((d) => d.stageId !== "won" && d.stageId !== "lost").reduce((s, d) => s + d.value, 0), [deals]);

  const analyticsSeries = useMemo(
    () => [
      { day: "Seg", leads: 12, wins: 2 },
      { day: "Ter", leads: 18, wins: 3 },
      { day: "Qua", leads: 15, wins: 2 },
      { day: "Qui", leads: 22, wins: 4 },
      { day: "Sex", leads: 19, wins: 3 },
      { day: "Sáb", leads: 7, wins: 1 },
      { day: "Dom", leads: 5, wins: 1 },
    ],
    []
  );

  const [messageDraft, setMessageDraft] = useState("");
  const [aiPrompt, setAiPrompt] = useState("Resuma a conversa e sugira a próxima ação.");
  const [aiResult, setAiResult] = useState("");

  function sendMessage() {
    const text = messageDraft.trim();
    if (!text) return;
    setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: text, lastAt: "agora" } : c)));
    setMessageDraft("");
  }

  function moveDeal(dealId: string, toStageId: string) {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stageId: toStageId } : d)));
  }

  function completeTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "done" } : t)));
  }

  async function runAI() {
    // stub: chama API se você estiver logado; por enquanto, simula
    setAiResult(
      "Resumo (stub): O lead pediu informação e está em momento de decisão.\n" +
        "Próxima ação: responder em até 5 min com prazo + condições + CTA para call.\n" +
        `Sugestão de mensagem: “Perfeito, ${selectedContact.name.split(" ")[0]}! Consigo entregar em X dias. Posso te mandar a proposta agora?”`
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-slate-900/10" />
              <h1 className="text-2xl font-semibold tracking-tight">Solutions</h1>
              <Pill>CRM Conversacional</Pill>
            </div>
            <p className="text-sm text-slate-600">Centralize WhatsApp + Instagram, funis, tarefas, automações, BI e IA — com processo claro e dado confiável.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar contatos, empresa, tags…" className="pl-9" />
            </div>
            <Button className="gap-2" onClick={() => alert("No MVP: crie via API /contacts")}>
              <Plus className="h-4 w-4" /> Novo lead
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
          <Card>
            <CardHeader>
              <div className="text-base font-semibold">Navegação</div>
              <div className="text-sm text-slate-500">MVP (protótipo)</div>
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
                  <div className="mt-1 text-base font-semibold">{currencyBRL(pipelineValue)}</div>
                </div>
                <div className="rounded-2xl border p-3">
                  <div className="text-xs text-slate-500">Tarefas abertas</div>
                  <div className="mt-1 text-base font-semibold">{tasks.filter((t) => t.status === "open").length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {view === "inbox" && (
              <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold">Conversas</div>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" /> Filtros
                      </Button>
                    </div>
                    <div className="text-sm text-slate-500">Omnichannel (WhatsApp + Instagram)</div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[520px] overflow-auto pr-2">
                      <div className="space-y-2">
                        {filteredContacts.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedContactId(c.id)}
                            className={`w-full rounded-2xl border p-3 text-left transition ${c.id === selectedContactId ? "bg-slate-100" : "hover:bg-slate-50"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-medium">{c.name}</span>
                                  <ChannelBadge c={c.channel} />
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <Building2 className="h-3.5 w-3.5" /> <span className="truncate">{c.company}</span>
                                </div>
                              </div>
                              <span className="shrink-0 text-xs text-slate-400">{c.lastAt}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.lastMessage}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {c.tags.slice(0, 3).map((t) => (
                                <Pill key={t}>
                                  <span className="inline-flex items-center gap-1">
                                    <Tag className="h-3.5 w-3.5" /> {t}
                                  </span>
                                </Pill>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{selectedContact?.name ?? "—"}</div>
                        <div className="truncate text-sm text-slate-500">{selectedContact?.company ?? "—"}</div>
                      </div>
                      {selectedContact ? <ChannelBadge c={selectedContact.channel} /> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border p-3">
                      <p className="text-sm text-slate-500">(MVP) aqui entra o histórico real via webhooks. Por enquanto, exibimos apenas a última mensagem.</p>
                      <div className="my-3 h-px bg-slate-200" />
                      <div className="space-y-2">
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-2xl border bg-white px-3 py-2">
                            <div className="text-sm">{selectedContact?.lastMessage ?? "—"}</div>
                            <div className="mt-1 text-xs text-slate-400">{selectedContact?.lastAt ?? ""}</div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl border bg-slate-100 px-3 py-2">
                            <div className="text-sm">Ok! Vou te enviar agora.</div>
                            <div className="mt-1 text-xs text-slate-400">há 2 min</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Textarea value={messageDraft} onChange={(e: any) => setMessageDraft(e.target.value)} placeholder="Escreva uma resposta…" className="min-h-[44px]" />
                      <Button onClick={sendMessage} className="h-[44px]">
                        <Send className="h-4 w-4" /> Enviar
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        className="rounded-2xl border p-4 text-left transition hover:bg-slate-50"
                        onClick={() => setTasks((p) => [{ id: `t_${Date.now()}`, title: `Follow-up (${selectedContact?.name ?? "Lead"})`, due: "Amanhã 10:00", status: "open", priority: "medium" }, ...p])}
                      >
                        <div className="font-medium">Criar tarefa</div>
                        <div className="mt-1 text-sm text-slate-500">Gera follow-up com data e prioridade</div>
                      </button>
                      <button
                        className="rounded-2xl border p-4 text-left transition hover:bg-slate-50"
                        onClick={() => {
                          const d = deals.find((x) => x.title.includes(selectedContact?.company ?? ""));
                          if (d) moveDeal(d.id, "prop");
                        }}
                      >
                        <div className="font-medium">Mover no funil</div>
                        <div className="mt-1 text-sm text-slate-500">Leva o lead para Proposta</div>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "pipeline" && (
              <div className="grid gap-4 lg:grid-cols-3">
                {stages.map((s) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="text-base font-semibold">{s.name}</div>
                        <Pill>{deals.filter((d) => d.stageId === s.id).length}</Pill>
                      </div>
                      <div className="text-sm text-slate-500">Mover etapas (MVP)</div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {deals
                        .filter((d) => d.stageId === s.id)
                        .map((d) => (
                          <div key={d.id} className="rounded-2xl border p-3">
                            <div className="font-medium">{d.title}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {currencyBRL(d.value)} • {d.owner}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {stages
                                .filter((x) => x.id !== s.id)
                                .slice(0, 3)
                                .map((x) => (
                                  <Button key={x.id} variant="outline" className="px-2 py-1 text-xs" onClick={() => moveDeal(d.id, x.id)}>
                                    → {x.name}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        ))}
                      {deals.filter((d) => d.stageId === s.id).length === 0 && <div className="rounded-2xl border p-3 text-sm text-slate-500">Sem negócios aqui.</div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {view === "contacts" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold">Contatos</div>
                      <div className="text-sm text-slate-500">Campos bem definidos → dado confiável → BI real</div>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Tag className="h-4 w-4" /> Gerenciar campos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredContacts.map((c) => (
                      <div key={c.id} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{c.name}</div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                              <Building2 className="h-4 w-4" /> <span className="truncate">{c.company}</span>
                            </div>
                          </div>
                          <ChannelBadge c={c.channel} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <Pill key={t}>{t}</Pill>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button variant="solid" className="text-xs" onClick={() => { setSelectedContactId(c.id); setView("inbox"); }}>
                            Abrir conversa
                          </Button>
                          <Button variant="outline" className="text-xs" onClick={() => alert("No produto: score por dados + IA")}>
                            Ver score
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {view === "automations" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold">Automações</div>
                      <div className="text-sm text-slate-500">Eliminar erro humano: datas, tempo entre fases, tarefas e regras</div>
                    </div>
                    <Button className="gap-2" onClick={() => alert("No MVP: crie via API /automations")}>
                      <Plus className="h-4 w-4" /> Novo fluxo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <AutomationCard title="Lead sem resposta em 15 min" trigger="Nova mensagem recebida" actions={["Criar tarefa alta prioridade", "Notificar gestor", "Adicionar tag: Sem resposta"]} />
                    <AutomationCard title="Entrou em Proposta" trigger="Mudança de etapa → Proposta" actions={["Gerar tarefa: Follow-up 24h", "Enviar template WhatsApp", "Atualizar BI: data/etapa"]} />
                    <AutomationCard title="Reativação 30 dias" trigger="Sem interação por 30 dias" actions={["Mover para funil de apoio", "Enviar sequência 3 mensagens", "Criar tarefa: ligação"]} />
                    <AutomationCard title="Não-lead (atendimento)" trigger="Palavras-chave de suporte" actions={["Mover para funil de não-leads", "Criar ticket", "SLA + lembrete automático"]} />
                  </div>

                  <div className="rounded-2xl border p-4 text-sm text-slate-500">
                    Motor de automações do Solutions: gatilhos por evento (mensagem/etapa/tag), condições (campo/canal/horário) e ações (tarefas, mensagens, webhooks, updates) — com logs e testes.
                  </div>
                </CardContent>
              </Card>
            )}

            {view === "analytics" && (
              <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">BI</div>
                    <div className="text-sm text-slate-500">Gestão acontece com dashboards (não no feeling)</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      <KPI title="Leads (7d)" value="98" hint="+12% vs semana anterior" />
                      <KPI title="Taxa ganho" value="18%" hint="Meta: 20%" />
                      <KPI title="Tempo médio" value="6,2 dias" hint="Ciclo de vendas" />
                    </div>

                    <div className="my-4 h-px bg-slate-200" />

                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="leads" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="wins" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 rounded-2xl border p-4 text-sm text-slate-500">
                      Métricas core: tempo 1ª resposta, tempo entre etapas, motivos de perda, atividades por vendedor, origem do lead (UTM), CAC/LTV, conversão por canal/campanha.
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Relatórios rápidos</div>
                    <div className="text-sm text-slate-500">Exportação e alertas</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full">Exportar (CSV)</Button>
                    <Button variant="outline" className="w-full">Enviar resumo diário</Button>
                    <Button variant="outline" className="w-full">Alerta: estágio parado</Button>
                    <div className="h-px bg-slate-200" />
                    <div className="space-y-2">
                      <MiniStat label="Conversas hoje" value="34" />
                      <MiniStat label="SLA violado" value="2" />
                      <MiniStat label="Leads quentes" value="11" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === "ai" && (
              <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Copiloto de IA</div>
                    <div className="text-sm text-slate-500">Resumo, qualificação, próxima ação e respostas sugeridas</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border p-4 text-sm text-slate-500">
                      (MVP) A saída abaixo é um stub. No produto real: usar contexto da conversa + dados do CRM + playbooks e gerar ações.
                    </div>

                    <Textarea value={aiPrompt} onChange={(e: any) => setAiPrompt(e.target.value)} className="min-h-[90px]" />
                    <Button onClick={runAI} className="gap-2">
                      <Sparkles className="h-4 w-4" /> Rodar IA
                    </Button>

                    <div className="rounded-2xl border p-4 whitespace-pre-wrap text-sm">{aiResult || "Resultado aparecerá aqui…"}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold">Playbooks</div>
                    <div className="text-sm text-slate-500">Padronize o que funciona</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Playbook title="Qualificação rápida" items={["Dor + urgência", "Orçamento", "Decisor", "Próximo passo"]} />
                    <Playbook title="Proposta" items={["Resumo do combinado", "Prazo", "Condições", "CTA"]} />
                    <Playbook title="Reativação" items={["Motivo do sumiço", "Oferta específica", "Prazo", "Pergunta fechada"]} />
                    <div className="rounded-2xl border p-3 text-sm text-slate-500">Ideia: IA sugere cadência e automatiza tarefas com base no estágio e perfil do lead.</div>
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

function MiniStat({ label, value }: any) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
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

function Playbook({ title, items }: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="font-medium">{title}</div>
      <ul className="mt-2 space-y-1 text-sm text-slate-500">
        {items.map((i: string) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AutomationCard({ title, trigger, actions }: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-sm text-slate-500">Gatilho: {trigger}</div>
        </div>
        <Pill>
          <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Ativo</span>
        </Pill>
      </div>
      <div className="my-3 h-px bg-slate-200" />
      <ul className="space-y-1 text-sm">
        {actions.map((a: string) => (
          <li key={a} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
