import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { saveAuth } from "../lib/auth";
import TechBackground from "../components/TechBackground";

type Mode = "login" | "register" | "forgot" | "reset";

interface Props {
  onAuth: () => void;
  onBack?: () => void;
  initialMode?: "login" | "register";
  /** white-label: orgId do parceiro (revenda) vindo do link ?marca= */
  marca?: string;
}

/** Traduz o código de erro da API numa mensagem amigável (nunca mostra JSON cru). */
function friendlyError(code: string): string {
  const map: Record<string, string> = {
    bad_credentials: "E-mail ou senha incorretos",
    email_in_use: "Este e-mail já está cadastrado",
    no_org: "Sua conta não está vinculada a nenhuma empresa",
    invalid_body: "Confira os dados e tente novamente",
    invalid_code: "Código inválido. Confira e tente de novo",
    code_expired: "Código expirado. Peça um novo",
    missing_token: "Sessão expirada. Entre novamente",
    invalid_token: "Sessão expirada. Entre novamente",
  };
  return map[code] || "Não foi possível concluir. Tente novamente";
}

const inputClass = "w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200";

export default function AuthPage({ onAuth, onBack, initialMode = "login", marca = "" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [code, setCode] = useState("");

  // white-label: se veio pelo link de um parceiro, veste a marca dele (logo/nome/cor/favicon)
  const [brand, setBrand] = useState<{ brandName?: string; brandColor?: string; brandLogoUrl?: string }>({});
  useEffect(() => {
    if (!marca) return;
    apiGet(`/public/branding/${marca}`)
      .then((b) => {
        setBrand(b || {});
        if (b?.brandName) document.title = b.brandName;
        if (b?.brandLogoUrl) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
          if (link) link.href = b.brandLogoUrl;
        }
      })
      .catch(() => {});
  }, [marca]);

  function go(m: Mode) {
    setMode(m);
    setError("");
    setInfo("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") {
        const data = await apiPost("/auth/login", { email, password });
        saveAuth(data.token, data.user, data.orgId, data.role ?? "agent");
        onAuth();
      } else if (mode === "register") {
        const data = await apiPost("/auth/register", { email, password, name, orgName, marca: marca || undefined });
        saveAuth(data.token, data.user, data.orgId, data.role ?? "owner");
        onAuth();
      } else if (mode === "forgot") {
        await apiPost("/auth/forgot-password", { email });
        setMode("reset");
        setInfo("Se este e-mail tiver conta, enviamos um código de 6 dígitos. Confira sua caixa de entrada (e o spam).");
      } else if (mode === "reset") {
        await apiPost("/auth/reset-password", { email, code, password });
        setPassword("");
        setCode("");
        setMode("login");
        setInfo("Senha redefinida! Agora é só entrar com a nova senha. ✅");
      }
    } catch (err: any) {
      setError(err.message || "erro");
    } finally {
      setLoading(false);
    }
  }

  const brandName = brand.brandName || "Solutions CRM";
  const title =
    mode === "forgot" ? "Recuperar senha" : mode === "reset" ? "Redefinir senha" : brandName;
  const cta =
    mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : mode === "forgot" ? "Enviar código" : "Redefinir senha";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <TechBackground />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950/70" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white/95 p-8 shadow-xl backdrop-blur">
        {onBack && (
          <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-800">← Voltar ao site</button>
        )}
        <div className="mb-6 flex items-center gap-2">
          <img src={brand.brandLogoUrl || "/logo.jpeg"} alt={brandName} className="h-10 w-10 rounded-2xl object-cover" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>

        {(mode === "login" || mode === "register") && (
          <div className="mb-6 flex rounded-2xl border p-1 gap-1">
            <button
              onClick={() => go("login")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "login" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => go("register")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "register" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
            >
              Criar conta
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <p className="mb-4 text-sm text-slate-500">Digite o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.</p>
        )}
        {mode === "reset" && (
          <p className="mb-4 text-sm text-slate-500">Cole o código que chegou no seu e-mail e escolha uma nova senha.</p>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Empresa / Organização</label>
                <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Nome da empresa" className={inputClass} />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className={inputClass} />
          </div>

          {mode === "reset" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Código de 6 dígitos</label>
              <input
                required
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className={`${inputClass} tracking-[0.4em] text-center text-lg`}
              />
            </div>
          )}

          {mode !== "forgot" && (
            <div>
              <label className="mb-1 block text-sm font-medium">{mode === "reset" ? "Nova senha" : "Senha"}</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
              {(mode === "register" || mode === "reset") && (
                <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres, com letras e números.</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {friendlyError(error)}
            </div>
          )}
          {info && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={brand.brandColor ? { backgroundColor: brand.brandColor } : undefined}
            className="w-full rounded-2xl bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Aguarde…" : cta}
          </button>
        </form>

        {mode === "login" && (
          <button onClick={() => go("forgot")} className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-800">
            Esqueci minha senha
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button onClick={() => go("login")} className="text-slate-500 hover:text-slate-800">← Voltar ao login</button>
            {mode === "reset" && (
              <button onClick={() => go("forgot")} className="text-slate-500 hover:text-slate-800">Reenviar código</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
