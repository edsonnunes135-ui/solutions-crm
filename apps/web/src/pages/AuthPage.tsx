import React, { useState } from "react";
import { apiPost } from "../lib/api";
import { saveAuth } from "../lib/auth";
import TechBackground from "../components/TechBackground";

interface Props {
  onAuth: () => void;
  onBack?: () => void;
  initialMode?: "login" | "register";
}

export default function AuthPage({ onAuth, onBack, initialMode = "login" }: Props) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await apiPost("/auth/login", { email, password });
        saveAuth(data.token, data.user, data.orgId, data.role ?? "agent");
      } else {
        const data = await apiPost("/auth/register", { email, password, name, orgName });
        saveAuth(data.token, data.user, data.orgId, data.role ?? "owner");
      }
      onAuth();
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <TechBackground />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950/70" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white/95 p-8 shadow-xl backdrop-blur">
        {onBack && (
          <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-800">← Voltar ao site</button>
        )}
        <div className="mb-6 flex items-center gap-2">
          <img src="/logo.jpeg" alt="Solutions" className="h-10 w-10 rounded-2xl object-cover" />
          <h1 className="text-2xl font-semibold tracking-tight">Solutions CRM</h1>
        </div>

        <div className="mb-6 flex rounded-2xl border p-1 gap-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "login" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "register" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Empresa / Organização</label>
                <input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Nome da empresa"
                  className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
            {mode === "register" && (
              <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres, com letras e números.</p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error === "bad_credentials" ? "E-mail ou senha incorretos" : error === "email_in_use" ? "E-mail já cadastrado" : error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
