import React, { useEffect, useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { roleLabel } from "../lib/roles";

function Input(props: any) {
  return <input {...props} className={`w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 ${props.className ?? ""}`} />;
}

/** Equipe e acessos — morava em Configurações; agora vive no Painel do Gestor. */
export default function TeamCard({ token }: { token: string }) {
  const [team, setTeam] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "", role: "agent" });
  const [teamMsg, setTeamMsg] = useState("");

  useEffect(() => {
    apiGet("/team", token).then(setTeam).catch(() => {});
  }, [token]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setTeamMsg("");
    try {
      const m = await apiPost("/team", newMember, token);
      setTeam((p) => [...p, { membershipId: m.membershipId, userId: m.userId, name: m.name, email: m.email, role: m.role }]);
      setNewMember({ name: "", email: "", password: "", role: "agent" });
      setTeamMsg(`Acesso criado para ${m.name}! Compartilhe o e-mail e a senha com a pessoa.`);
    } catch (err: any) {
      const msg = err.message.includes("already_member") ? "Essa pessoa já faz parte da equipe."
        : err.message.includes("invalid_body") ? "Verifique os campos (senha: mínimo 8 caracteres com letras e números)."
        : err.message;
      setTeamMsg(`Erro: ${msg}`);
    }
  }

  async function removeMember(membershipId: string, name: string) {
    if (!confirm(`Remover o acesso de ${name}?`)) return;
    try {
      await apiDelete(`/team/${membershipId}`, token);
      setTeam((p) => p.filter((m) => m.membershipId !== membershipId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <UserPlus className="h-4 w-4 text-emerald-500" /> Equipe e acessos
        </div>
        <div className="text-sm text-slate-500">Crie logins para vendedores e gestores. Cada um entra com o próprio e-mail e senha.</div>
      </div>
      <div className="p-4 pt-0 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="py-2">Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.membershipId} className="border-b last:border-0">
                  <td className="py-2 font-medium">{m.name}</td>
                  <td className="text-slate-600">{m.email}</td>
                  <td>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${m.role === "owner" ? "border-amber-300 text-amber-700" : m.role === "partner" ? "border-purple-300 text-purple-700" : m.role === "admin" ? "border-blue-300 text-blue-700" : "text-slate-600"}`}>
                      {roleLabel[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="text-right">
                    {m.role !== "owner" && (
                      <button onClick={() => removeMember(m.membershipId, m.name)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remover acesso">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={addMember} className="rounded-2xl border border-slate-200/80 p-4">
          <div className="mb-3 text-sm font-medium">Novo acesso</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input required value={newMember.name} onChange={(e: any) => setNewMember((p) => ({ ...p, name: e.target.value }))} placeholder="Nome" />
            <Input required type="email" value={newMember.email} onChange={(e: any) => setNewMember((p) => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
            <Input required type="text" value={newMember.password} onChange={(e: any) => setNewMember((p) => ({ ...p, password: e.target.value }))} placeholder="Senha inicial (8+ chars, letras e números)" />
            <select
              value={newMember.role}
              onChange={(e) => setNewMember((p) => ({ ...p, role: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="agent">Vendedor</option>
              <option value="admin">Gerente</option>
              <option value="partner">Sócio</option>
              <option value="viewer">Somente visualização</option>
            </select>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]">
              Criar acesso
            </button>
            {teamMsg && <span className={`text-sm ${teamMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{teamMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
