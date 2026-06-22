import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { saveAuth } from "../lib/auth";
import TechBackground from "../components/TechBackground";
import { useLang, auth, LanguageSelector } from "../lib/i18n";

type Mode = "login" | "register" | "forgot" | "reset";

interface Props {
  onAuth: () => void;
  onBack?: () => void;
  initialMode?: "login" | "register";
  /** white-label: orgId do parceiro (revenda) vindo do link ?marca= */
  marca?: string;
}

const inputClass = "w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200";

export default function AuthPage({ onAuth, onBack, initialMode = "login", marca = "" }: Props) {
  const { lang } = useLang();
  const T = auth[lang];
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
        setInfo(T.infoCodeSent);
      } else if (mode === "reset") {
        await apiPost("/auth/reset-password", { email, code, password });
        setPassword("");
        setCode("");
        setMode("login");
        setInfo(T.infoReset);
      }
    } catch (err: any) {
      setError(err.message || "erro");
    } finally {
      setLoading(false);
    }
  }

  const brandName = brand.brandName || "Solutions CRM";
  const title =
    mode === "forgot" ? T.forgotTitle : mode === "reset" ? T.resetTitle : brandName;
  const cta =
    mode === "login" ? T.loginBtn : mode === "register" ? T.signupBtn : mode === "forgot" ? T.sendCodeBtn : T.resetBtn;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <TechBackground />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950/70" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white/95 p-8 shadow-xl backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          {onBack ? (
            <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">{T.backToSite}</button>
          ) : <span />}
          <LanguageSelector variant="light" />
        </div>
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
              {T.tabLogin}
            </button>
            <button
              onClick={() => go("register")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "register" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
            >
              {T.tabSignup}
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <p className="mb-4 text-sm text-slate-500">{T.forgotPara}</p>
        )}
        {mode === "reset" && (
          <p className="mb-4 text-sm text-slate-500">{T.resetPara}</p>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">{T.nameLabel}</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={T.namePh} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{T.companyLabel}</label>
                <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={T.companyPh} className={inputClass} />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">{T.emailLabel}</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T.emailPh} className={inputClass} />
          </div>

          {mode === "reset" && (
            <div>
              <label className="mb-1 block text-sm font-medium">{T.codeLabel}</label>
              <input
                required
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={T.codePh}
                className={`${inputClass} tracking-[0.4em] text-center text-lg`}
              />
            </div>
          )}

          {mode !== "forgot" && (
            <div>
              <label className="mb-1 block text-sm font-medium">{mode === "reset" ? T.newPasswordLabel : T.passwordLabel}</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
              {(mode === "register" || mode === "reset") && (
                <p className="mt-1 text-xs text-slate-500">{T.passwordHint}</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {T.err[error] || T.errDefault}
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
            {loading ? T.loading : cta}
          </button>
        </form>

        {mode === "login" && (
          <button onClick={() => go("forgot")} className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-800">
            {T.forgotLink}
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button onClick={() => go("login")} className="text-slate-500 hover:text-slate-800">{T.backToLogin}</button>
            {mode === "reset" && (
              <button onClick={() => go("forgot")} className="text-slate-500 hover:text-slate-800">{T.resendCode}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
