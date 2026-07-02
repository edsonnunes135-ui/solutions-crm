import React, { useEffect, useState } from "react";
import { Crown, TrendingUp, TrendingDown, Users, Inbox, Wallet, Percent, Sparkles } from "lucide-react";
import { apiGet } from "../lib/api";
import { roleLabel } from "../lib/roles";
import TeamCard from "../components/TeamCard";

function currencyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>{children}</div>;
}

function KPI({ title, value, hint, icon, tint }: any) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{title}</div>
          <div className="truncate text-xl font-bold leading-tight">{value}</div>
        </div>
      </div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default function ManagerView({ token, hideValues = false }: { token: string; hideValues?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [svc, setSvc] = useState<any>(null);
  const [error, setError] = useState("");
  const money = (v: number) => (hideValues ? "R$ ••••••" : currencyBRL(v));

  useEffect(() => {
    apiGet("/analytics/manager", token).then(setData).catch((e) => setError(e.message));
    apiGet("/inbox/service-metrics", token).then(setSvc).catch(() => {});
  }, [token]);

  if (error) return <Card><div className="p-6 text-sm text-red-600">Acesso restrito a gestores. ({error})</div></Card>;
  if (!data) return <Card><div className="p-6 text-sm text-slate-500">Carregando painel…</div></Card>;

  const t = data.totals;
  // Previsão de fechamento = pipeline em aberto × taxa de ganho histórica (forecast simples, sem IA)
  const forecast = Math.round((t.pipelineValue || 0) * ((t.winRate || 0) / 100));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"><Crown className="h-4 w-4" /></span>
          Painel do Gestor
        </h1>
        <p className="mt-1 text-sm text-slate-500">Visão executiva da operação · dados reais</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Receita (ganhos)" value={money(t.revenue)} hint={`${t.dealsWon} negócios fechados`} icon={<Wallet className="h-4 w-4" />} tint="bg-emerald-50 text-emerald-600" />
        <KPI title="Pipeline aberto" value={money(t.pipelineValue)} hint={`${t.dealsOpen} em andamento`} icon={<TrendingUp className="h-4 w-4" />} tint="bg-violet-50 text-violet-600" />
        <KPI title="Taxa de ganho" value={t.winRate !== null ? `${t.winRate}%` : "0%"} hint={`${t.dealsLost} perdidos`} icon={<Percent className="h-4 w-4" />} tint="bg-sky-50 text-sky-600" />
        <KPI title="Leads" value={t.contacts} hint={`${t.tasksOpen} tarefas abertas`} icon={<Users className="h-4 w-4" />} tint="bg-blue-50 text-blue-600" />
      </div>

      {/* Previsão de fechamento */}
      <Card className="overflow-hidden border-emerald-200">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Sparkles className="h-4 w-4 text-emerald-500" /> Previsão de fechamento</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">{money(forecast)}</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>de <strong>{money(t.pipelineValue)}</strong> em aberto</div>
            <div>× <strong>{t.winRate ?? 0}%</strong> de taxa de ganho histórica</div>
          </div>
        </div>
      </Card>

      {/* Filas de atendimento */}
      {svc && (
        <Card>
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold"><Inbox className="h-5 w-5 text-sky-500" /> Filas de atendimento</div>
            <div className="text-sm text-slate-500">Distribuição automática entre a equipe + SLA em tempo real</div>
          </div>
          <div className="p-4 pt-0">
            <div className="grid gap-3 md:grid-cols-4">
              <KPI title="Conversas abertas" value={svc.open} icon={<Inbox className="h-4 w-4" />} tint="bg-sky-50 text-sky-600" />
              <KPI title="Sem atendente" value={svc.unassigned} icon={<Users className="h-4 w-4" />} tint="bg-amber-50 text-amber-600" />
              <KPI title="Esperando resposta" value={svc.waiting} hint={svc.oldestWaitMin != null ? `mais antiga: ${svc.oldestWaitMin >= 60 ? Math.floor(svc.oldestWaitMin / 60) + "h" : svc.oldestWaitMin + "min"}` : undefined} icon={<TrendingDown className="h-4 w-4" />} tint="bg-rose-50 text-rose-600" />
              <KPI title="Vendedores ativos" value={svc.byAgent.length} icon={<Users className="h-4 w-4" />} tint="bg-emerald-50 text-emerald-600" />
            </div>
            {svc.byAgent.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-slate-500">Carga por vendedor (conversas abertas)</div>
                <div className="space-y-2">
                  {svc.byAgent.map((a: any) => {
                    const max = svc.byAgent[0].open || 1;
                    return (
                      <div key={a.name}>
                        <div className="flex items-center justify-between text-sm"><span className="text-slate-700">{a.name}</span><span className="font-semibold">{a.open}</span></div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" style={{ width: `${(a.open / max) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Desempenho por membro */}
        <Card>
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold"><Users className="h-4 w-4 text-blue-500" /> Desempenho por membro</div>
          </div>
          <div className="p-4 pt-0">
            {data.byMember.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhum membro ainda.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="py-2">Membro</th>
                    <th>Negócios</th>
                    <th>Ganhos</th>
                    <th className="text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byMember.map((m: any) => (
                    <tr key={m.userId} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-slate-500">{roleLabel[m.role] ?? m.role}</div>
                      </td>
                      <td>{m.deals}</td>
                      <td><span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> {m.won}</span></td>
                      <td className="text-right font-semibold">{money(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Motivos de perda */}
        <Card>
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold"><TrendingDown className="h-4 w-4 text-rose-500" /> Motivos de perda</div>
            <div className="text-sm text-slate-500">Onde os negócios estão morrendo</div>
          </div>
          <div className="p-4 pt-0">
            {data.lossReasons.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhuma perda registrada. Bom sinal! 🎉</div>
            ) : (
              <div className="space-y-2.5">
                {data.lossReasons.map((r: any) => {
                  const max = data.lossReasons[0].count;
                  return (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between text-sm"><span className="text-slate-700">{r.reason}</span><span className="font-semibold">{r.count}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-red-500" style={{ width: `${(r.count / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Equipe e acessos — movido de Configurações pra cá (gestão de pessoas é gestão) */}
      <TeamCard token={token} />
    </div>
  );
}
