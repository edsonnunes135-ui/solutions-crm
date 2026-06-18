import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { relativeTime, usageLabel } from "../lib/presence";

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  online: boolean;
  lastSeenAt: string | null;
  usageMinutes: number;
}

const roleLabel: Record<string, string> = { owner: "Dono", partner: "Sócio", admin: "Gestor", agent: "Vendedor", viewer: "Visualização" };

export default function VendedoresView({ token }: { token: string }) {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await apiGet("/presence/team", token);
      setRows(Array.isArray(r) ? r : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const online = useMemo(() => rows.filter((r) => r.online).length, [rows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.online) - Number(a.online)), [rows]);

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando a equipe…</div>;

  return (
    <div className="space-y-4 p-1">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Vendedores</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sua equipe em tempo real. <span className="text-emerald-600 font-medium">{online} online</span> · {rows.length - online} offline. Atualiza sozinho a cada 30s.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((m) => (
          <div key={m.userId} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${m.online ? "bg-emerald-500" : "bg-red-400"}`} />
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800">{m.name}</div>
                  <div className="truncate text-xs text-slate-500">{m.email}</div>
                </div>
              </div>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-slate-500">{roleLabel[m.role] ?? m.role}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <div>
                <div className="text-slate-400">Status</div>
                <div className={m.online ? "font-medium text-emerald-700" : "font-medium text-slate-500"}>{m.online ? "Online agora" : relativeTime(m.lastSeenAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400">Tempo de uso</div>
                <div className="font-medium text-slate-700">{usageLabel(m.usageMinutes)}</div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-slate-400">Nenhum membro na equipe ainda. Cadastre vendedores em Configurações → Equipe.</div>}
      </div>
    </div>
  );
}
