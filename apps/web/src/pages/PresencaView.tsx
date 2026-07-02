import React, { useEffect, useMemo, useState } from "react";
import { UserCheck } from "lucide-react";
import { apiGet } from "../lib/api";
import { relativeTime, usageLabel } from "../lib/presence";
import { roleLabel } from "../lib/roles";

interface Presence {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  online: boolean;
  lastSeenAt: string | null;
  usageMinutes: number;
}

function Dot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-red-400"}`} />
      <span className={`text-xs font-medium ${online ? "text-emerald-700" : "text-slate-500"}`}>{online ? "Online" : "Offline"}</span>
    </span>
  );
}

export default function PresencaView({ token }: { token: string }) {
  const [rows, setRows] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const r = await apiGet("/admin/presence", token);
      setRows(Array.isArray(r) ? r : []);
      setError("");
    } catch (err: any) {
      setError(err?.message === "forbidden" ? "forbidden" : "load_error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // atualiza a cada 30s
    return () => clearInterval(t);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const online = useMemo(() => rows.filter((r) => r.online).length, [rows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.online) - Number(a.online)), [rows]);

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando presença…</div>;
  if (error === "forbidden") return <div className="p-6 text-sm text-red-600">Acesso restrito ao CEO da plataforma.</div>;
  if (error) return <div className="p-6 text-sm text-red-600">Não foi possível carregar agora. Tente de novo.</div>;

  return (
    <div className="space-y-4 p-1">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white"><UserCheck className="h-4 w-4" /></span> Presença</h1>
          <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">CEO</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">Quem está online agora, há quanto tempo não acessa e o tempo total de uso. Atualiza sozinho a cada 30s.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Online agora</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-emerald-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />{online}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Offline</div>
          <div className="mt-1 text-2xl font-semibold text-slate-700">{rows.length - online}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total de contas</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{rows.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Último acesso</th>
                <th className="px-4 py-2 font-medium">Tempo de uso</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2"><Dot online={u.online} /></td>
                  <td className="px-4 py-2 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600">{u.company || "—"} {u.role && <span className="text-xs text-slate-400">· {roleLabel[u.role] ?? u.role}</span>}</td>
                  <td className="px-4 py-2 text-slate-600">{u.online ? "agora" : relativeTime(u.lastSeenAt)}</td>
                  <td className="px-4 py-2 text-slate-800">{usageLabel(u.usageMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
