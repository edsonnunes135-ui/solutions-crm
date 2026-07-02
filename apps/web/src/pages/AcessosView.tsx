import React, { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { apiGet } from "../lib/api";
import { roleLabel } from "../lib/roles";

interface AccessUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  companies: { org: string; role: string }[];
}

export default function AcessosView({ token }: { token: string }) {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet("/admin/users", token)
      .then((u) => setUsers(Array.isArray(u) ? u : []))
      .catch((err) => setError(err?.message === "forbidden" ? "forbidden" : "load_error"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t) || u.companies.some((c) => c.org.toLowerCase().includes(t))
    );
  }, [users, q]);

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando os acessos…</div>;
  if (error === "forbidden") return <div className="p-6 text-sm text-red-600">Acesso restrito ao CEO da plataforma.</div>;
  if (error) return <div className="p-6 text-sm text-red-600">Não foi possível carregar agora. Tente de novo.</div>;

  return (
    <div className="space-y-4 p-1">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 text-white"><Users className="h-4 w-4" /></span> Acessos</h1>
          <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">CEO</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Todas as pessoas que criaram conta na Solutions, com nome e e-mail. Total: <strong>{users.length}</strong>.
        </p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome, e-mail ou empresa…"
        className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Nome do cliente</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Cargo</th>
                <th className="px-4 py-2 font-medium">Criou conta em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.companies.length ? u.companies.map((c) => c.org).join(", ") : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.companies.length ? u.companies.map((c) => roleLabel[c.role] ?? c.role).join(", ") : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">Nenhum acesso encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
