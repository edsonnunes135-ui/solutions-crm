import React, { useEffect, useState } from "react";
import { Crown, TrendingUp, TrendingDown, Users } from "lucide-react";
import { apiGet } from "../lib/api";

function currencyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}

function KPI({ title, value, hint }: any) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-sm text-slate-500">{hint}</div>}
    </div>
  );
}

const roleLabel: Record<string, string> = {
  owner: "CEO e Founder",
  partner: "Sócio",
  admin: "Gestor",
  agent: "Vendedor",
  viewer: "Visualização",
};

export default function ManagerView({ token, hideValues = false }: { token: string; hideValues?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const money = (v: number) => (hideValues ? "R$ ••••••" : currencyBRL(v));

  useEffect(() => {
    apiGet("/analytics/manager", token).then(setData).catch((e) => setError(e.message));
  }, [token]);

  if (error) return <Card><div className="p-6 text-sm text-red-600">Acesso restrito a gestores. ({error})</div></Card>;
  if (!data) return <Card><div className="p-6 text-sm text-slate-500">Carregando painel…</div></Card>;

  const t = data.totals;

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Crown className="h-5 w-5 text-amber-500" /> Painel do Gestor
          </div>
          <div className="text-sm text-slate-500">Visão executiva da operação</div>
        </div>
        <div className="p-4 pt-0">
          <div className="grid gap-3 md:grid-cols-4">
            <KPI title="Receita (ganhos)" value={money(t.revenue)} hint={`${t.dealsWon} negócios fechados`} />
            <KPI title="Pipeline aberto" value={money(t.pipelineValue)} hint={`${t.dealsOpen} em andamento`} />
            <KPI title="Taxa de ganho" value={t.winRate !== null ? `${t.winRate}%` : "0%"} hint={`${t.dealsLost} perdidos`} />
            <KPI title="Leads" value={t.contacts} hint={`${t.tasksOpen} tarefas abertas`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4" /> Desempenho por membro
            </div>
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
                      <td>
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" /> {m.won}
                        </span>
                      </td>
                      <td className="text-right font-medium">{money(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <TrendingDown className="h-4 w-4 text-red-500" /> Motivos de perda
            </div>
            <div className="text-sm text-slate-500">Onde os negócios estão morrendo</div>
          </div>
          <div className="p-4 pt-0">
            {data.lossReasons.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhuma perda registrada. Bom sinal! 🎉</div>
            ) : (
              <div className="space-y-2">
                {data.lossReasons.map((r: any) => {
                  const max = data.lossReasons[0].count;
                  return (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{r.reason}</span>
                        <span className="font-medium">{r.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-red-400" style={{ width: `${(r.count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
