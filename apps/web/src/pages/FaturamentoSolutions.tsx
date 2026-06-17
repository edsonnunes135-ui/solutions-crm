import React, { useEffect, useState } from "react";
import { apiGet, apiPut } from "../lib/api";

interface Company {
  id: string;
  name: string;
  plan: string;
  planName: string;
  seats: number;
  monthly: number;
  createdAt: string;
}
interface Metrics {
  mrr: number;
  arr: number;
  totalCompanies: number;
  activeSubscriptions: number;
  trialCount: number;
  newThisMonth: number;
  totalUsers: number;
  planCounts: Record<string, number>;
  plans: { key: string; name: string; price: number }[];
  companies: Company[];
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const planStyle: Record<string, string> = {
  trial: "border-slate-300 text-slate-600",
  starter: "border-emerald-300 text-emerald-700",
  pro: "border-blue-300 text-blue-700",
  business: "border-purple-300 text-purple-700",
};

export default function FaturamentoSolutions({ token }: { token: string }) {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const m = await apiGet("/admin/metrics", token);
      setData(m);
      setError("");
    } catch (err: any) {
      setError(err?.message === "forbidden" ? "forbidden" : "load_error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changePlan(orgId: string, plan: string) {
    try {
      await apiPut(`/admin/orgs/${orgId}/plan`, { plan }, token);
      load();
    } catch {
      /* ignore */
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando o faturamento da Solutions…</div>;
  if (error === "forbidden")
    return <div className="p-6 text-sm text-red-600">Acesso restrito ao CEO da plataforma.</div>;
  if (error || !data) return <div className="p-6 text-sm text-red-600">Não foi possível carregar agora. Tente de novo.</div>;

  const cards = [
    { label: "MRR (receita recorrente/mês)", value: brl(data.mrr), hint: `${brl(data.arr)} por ano` },
    { label: "Assinaturas ativas", value: String(data.activeSubscriptions), hint: `${data.totalCompanies} empresas no total` },
    { label: "Em teste grátis", value: String(data.trialCount), hint: `${data.newThisMonth} novas este mês` },
    { label: "Acessos (usuários) na base", value: String(data.totalUsers), hint: "Somando todas as empresas" },
  ];

  return (
    <div className="space-y-6 p-1">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Faturamento da Solutions</h1>
          <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">CEO</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Quanto a Solutions fatura com as assinaturas. Não inclui as vendas internas das empresas-clientes — isso fica privado de cada uma.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</div>
            <div className="mt-1 text-xs text-slate-400">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-600">Empresas por plano</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["trial", "starter", "pro", "business"].map((k) => {
            const p = data.plans.find((x) => x.key === k);
            return (
              <div key={k} className="rounded-xl border bg-slate-50 p-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">{data.planCounts[k] ?? 0}</div>
                <div className="text-xs text-slate-500">{p?.name ?? k}</div>
                <div className="text-[11px] text-slate-400">{p && p.price > 0 ? `${brl(p.price)}/usuário` : "grátis"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="border-b px-4 py-3 text-sm font-medium text-slate-600">
          Empresas ({data.companies.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 font-medium">Acessos</th>
                <th className="px-4 py-2 font-medium">Paga/mês</th>
                <th className="px-4 py-2 font-medium">Desde</th>
                <th className="px-4 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${planStyle[c.plan] ?? "border-slate-300 text-slate-600"}`}>
                      {c.planName}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.seats}</td>
                  <td className="px-4 py-2 text-slate-800">{c.monthly > 0 ? brl(c.monthly) : "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2">
                    <select
                      value={c.plan}
                      onChange={(e) => changePlan(c.id, e.target.value)}
                      className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-slate-200"
                      title="Trocar o plano desta empresa (ativação manual)"
                    >
                      <option value="trial">Teste grátis</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
