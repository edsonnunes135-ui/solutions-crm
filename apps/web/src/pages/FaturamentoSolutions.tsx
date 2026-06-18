import React, { useEffect, useState } from "react";
import { apiGet, apiPut, apiPost, apiDelete } from "../lib/api";
import { startImpersonation } from "../lib/auth";

interface Company {
  id: string;
  name: string;
  plan: string;
  planName: string;
  seats: number;
  monthly: number;
  internal?: boolean;
  createdAt: string;
}
interface Metrics {
  mrr: number;
  arr: number;
  totalRevenue: number;
  monthsTracked: number;
  revenueByMonth: { label: string; value: number }[];
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

export default function FaturamentoSolutions({ token, hideValues = false }: { token: string; hideValues?: boolean }) {
  const money = (n: number) => (hideValues ? "R$ ••••••" : brl(n));
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

  async function enterCompany(orgId: string, orgName: string) {
    if (!confirm(`Entrar no modo suporte da empresa "${orgName}"?\n\nVocê vai acessar a conta dela para dar suporte. Dá pra sair a qualquer momento pelo aviso roxo no topo.`)) return;
    try {
      const r = await apiPost("/admin/impersonate", { orgId }, token);
      startImpersonation(r.token, r.orgId, r.role, r.orgName);
      window.location.reload();
    } catch {
      /* ignore */
    }
  }

  const [noticeMsg, setNoticeMsg] = useState("");
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [noticeStatus, setNoticeStatus] = useState("");
  async function publishNotice() {
    if (noticeMsg.trim().length < 2) return;
    setNoticeBusy(true);
    setNoticeStatus("");
    try {
      await apiPost("/admin/notices", { message: noticeMsg.trim(), level: "info" }, token);
      setNoticeMsg("");
      setNoticeStatus("Aviso publicado para todos! 📢");
    } catch {
      setNoticeStatus("Não foi possível publicar agora.");
    } finally {
      setNoticeBusy(false);
    }
  }
  async function clearNotice() {
    setNoticeBusy(true);
    setNoticeStatus("");
    try {
      await apiDelete("/admin/notices", token);
      setNoticeStatus("Aviso removido.");
    } catch {
      /* ignore */
    } finally {
      setNoticeBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando o faturamento da Solutions…</div>;
  if (error === "forbidden")
    return <div className="p-6 text-sm text-red-600">Acesso restrito ao CEO da plataforma.</div>;
  if (error || !data) return <div className="p-6 text-sm text-red-600">Não foi possível carregar agora. Tente de novo.</div>;

  const meses = data.monthsTracked === 1 ? "mês" : "meses";
  const cards = [
    { label: "MRR (receita recorrente/mês)", value: money(data.mrr), hint: `${money(data.arr)} por ano` },
    { label: "Faturamento total acumulado", value: money(data.totalRevenue), hint: data.monthsTracked > 0 ? `em ${data.monthsTracked} ${meses} de operação` : "ainda sem assinaturas pagas" },
    { label: "Assinaturas ativas", value: String(data.activeSubscriptions), hint: `${data.totalCompanies} empresas no total` },
    { label: "Acessos (usuários) na base", value: String(data.totalUsers), hint: `${data.trialCount} em teste · ${data.newThisMonth} novas este mês` },
  ];
  const maxMonth = Math.max(1, ...data.revenueByMonth.map((m) => m.value));

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
        <div className="mb-1 text-sm font-medium text-slate-600">Faturamento por mês (últimos 12 meses)</div>
        <div className="mb-3 text-xs text-slate-400">Estimativa: cada assinatura ativa conta desde que entrou. {hideValues ? "Valores ocultos." : ""}</div>
        <div className="flex items-end gap-1.5" style={{ height: 120 }}>
          {data.revenueByMonth.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${m.label}: ${money(m.value)}`}>
              <div
                className="w-full rounded-t bg-gradient-to-t from-blue-500 to-indigo-500"
                style={{ height: `${Math.round((m.value / maxMonth) * 96)}px`, minHeight: m.value > 0 ? 4 : 2, opacity: m.value > 0 ? 1 : 0.25 }}
              />
              <div className="text-[10px] text-slate-400">{m.label.replace(".", "")}</div>
            </div>
          ))}
        </div>
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

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 text-sm font-medium text-slate-600">📢 Aviso para o app inteiro</div>
        <div className="text-xs text-slate-500">Aparece como uma faixa no topo do app de todas as empresas e usuários. Use para manutenção, novidades, avisos.</div>
        <textarea
          value={noticeMsg}
          onChange={(e) => setNoticeMsg(e.target.value.slice(0, 280))}
          placeholder="Ex.: Manutenção programada hoje às 22h. Pode haver instabilidade por alguns minutos."
          rows={2}
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={publishNotice}
            disabled={noticeBusy || noticeMsg.trim().length < 2}
            className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Publicar aviso
          </button>
          <button onClick={clearNotice} disabled={noticeBusy} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50">
            Limpar aviso atual
          </button>
          {noticeStatus && <span className="text-xs text-slate-500">{noticeStatus}</span>}
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
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {c.name}
                    {c.internal && <span className="ml-2 rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500">sua conta</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${planStyle[c.plan] ?? "border-slate-300 text-slate-600"}`}>
                      {c.planName}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.seats}</td>
                  <td className="px-4 py-2 text-slate-800">{c.monthly > 0 ? money(c.monthly) : "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={c.plan}
                        onChange={(e) => changePlan(c.id, e.target.value)}
                        className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-slate-200"
                        title="Trocar o plano desta empresa (ativação manual, sem cobrança)"
                      >
                        <option value="trial">Teste grátis</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                      </select>
                      {!c.internal && (
                        <button
                          onClick={() => enterCompany(c.id, c.name)}
                          className="rounded-lg border border-purple-300 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50"
                          title="Entrar nesta empresa para dar suporte"
                        >
                          Entrar
                        </button>
                      )}
                    </div>
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
