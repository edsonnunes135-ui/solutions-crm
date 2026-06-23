import React, { useEffect, useState } from "react";
import { Phone, Instagram, UserPlus, Trash2, CheckCircle2, CreditCard, Sparkles, Bell, Palette, Building2 } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { getUser, saveAuth } from "../lib/auth";
import { enablePush, pushSupported } from "../lib/push";
import { roleLabel } from "../lib/roles";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}

function Input(props: any) {
  return <input {...props} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${props.className ?? ""}`} />;
}

export default function SettingsView({ token, isManager }: { token: string; isManager: boolean }) {
  const isOwner = getUser()?.role === "owner";
  // WhatsApp
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  // Instagram
  const [igPageId, setIgPageId] = useState("");
  const [igToken, setIgToken] = useState("");
  const [hasIgToken, setHasIgToken] = useState(false);
  const [igSaved, setIgSaved] = useState(false);
  const [igLoading, setIgLoading] = useState(false);

  // IA & notificações
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  // Aba ativa da página de Configurações
  const [tab, setTab] = useState("plano");

  // Marca (white-label)
  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#38bdf8");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandMsg, setBrandMsg] = useState("");

  // Empresas (revenda)
  const [orgs, setOrgs] = useState<any[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [orgMsg, setOrgMsg] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const myOrgId = getUser()?.orgId ?? "";
  const brandLink = typeof window !== "undefined" ? `${window.location.origin}/?marca=${myOrgId}` : "";
  const widgetSnippet = `<script src="https://solutions-api.onrender.com/widget.js" data-org="${myOrgId}"></script>`;

  // Planos do parceiro (white-label Fase 2)
  const [rplans, setRplans] = useState<any[]>([]);
  const [newPlan, setNewPlan] = useState({ name: "", price: 0, users: 2, contacts: 1000, automations: 5, broadcast: false, ai: false });
  const [planBusy, setPlanBusy] = useState(false);

  const [mpStatus, setMpStatus] = useState<any>(null);
  const [feeStatus, setFeeStatus] = useState<any>(null);
  useEffect(() => {
    if (!isManager) return;
    apiGet("/reseller/clients", token).then(setClients).catch(() => {});
    apiGet("/reseller/plans", token).then(setRplans).catch(() => {});
    apiGet("/reseller/mp/status", token).then(setMpStatus).catch(() => {});
    apiGet("/reseller/platform-fee/status", token).then(setFeeStatus).catch(() => {});
  }, [token, isManager]);

  async function connectMp() {
    try {
      const r = await apiGet("/reseller/mp/connect-url", token);
      if (r?.url) window.location.href = r.url;
    } catch {
      alert("A divisão de pagamento ainda não foi ativada na plataforma (falta configurar o Mercado Pago no servidor).");
    }
  }
  async function disconnectMp() {
    if (!confirm("Desconectar sua conta Mercado Pago? Os clientes deixam de poder pagar você por aqui.")) return;
    await apiDelete("/reseller/mp", token);
    setMpStatus(await apiGet("/reseller/mp/status", token));
  }
  async function subscribeFee() {
    try {
      const r = await apiPost("/reseller/platform-fee/subscribe", {}, token);
      if (r?.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
    } catch (err: any) {
      const m = String(err?.message ?? "");
      if (m.includes("no_paying_clients")) alert("Você ainda não tem clientes em planos pagos. Atribua um plano pago a um cliente antes de autorizar a taxa.");
      else if (m.includes("platform_mp_not_configured")) alert("A taxa da plataforma ainda não foi ativada no servidor.");
      else alert("Não foi possível iniciar a autorização. Tente novamente.");
    }
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlan.name.trim() || planBusy) return;
    setPlanBusy(true);
    try {
      await apiPost("/reseller/plans", { ...newPlan, price: Number(newPlan.price), users: Number(newPlan.users), contacts: Number(newPlan.contacts), automations: Number(newPlan.automations) }, token);
      setNewPlan({ name: "", price: 0, users: 2, contacts: 1000, automations: 5, broadcast: false, ai: false });
      setRplans(await apiGet("/reseller/plans", token));
    } catch {
      /* ignore */
    } finally {
      setPlanBusy(false);
    }
  }
  async function deletePlan(id: string) {
    if (!confirm("Remover este plano?")) return;
    await apiDelete(`/reseller/plans/${id}`, token);
    setRplans(await apiGet("/reseller/plans", token));
  }
  async function assignPlan(orgId: string, planId: string) {
    await apiPost(`/reseller/clients/${orgId}/plan`, { planId: planId || null }, token);
    setClients(await apiGet("/reseller/clients", token));
  }

  // Plano
  const [billing, setBilling] = useState<any>(null);
  const [planMsg, setPlanMsg] = useState("");

  // Equipe
  const [team, setTeam] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "", role: "agent" });
  const [teamMsg, setTeamMsg] = useState("");

  useEffect(() => {
    if (!isManager) return;
    apiGet("/settings", token).then((s) => {
      setWaPhoneId(s.whatsappPhoneNumberId ?? "");
      setHasToken(s.hasWhatsappToken);
      setIgPageId(s.instagramPageId ?? "");
      setHasIgToken(s.hasInstagramToken ?? false);
      setAiAutoReply(s.aiAutoReply ?? false);
      if (s.brandName) setBrandName(s.brandName);
      if (s.brandColor) setBrandColor(s.brandColor);
      if (s.brandLogoUrl) setBrandLogoUrl(s.brandLogoUrl);
    }).catch(() => {});
    apiGet("/orgs", token).then(setOrgs).catch(() => {});
    apiGet("/team", token).then(setTeam).catch(() => {});
    apiGet("/billing", token).then(setBilling).catch(() => {});
  }, [token, isManager]);

  async function choosePlan(planKey: string, planName: string, price: number) {
    setPlanMsg("");
    // 1) tenta o checkout recorrente do Mercado Pago
    try {
      const r = await apiPost("/billing/checkout", { plan: planKey }, token);
      if (r.checkoutUrl) {
        setPlanMsg("Redirecionando para o pagamento seguro do Mercado Pago…");
        window.location.href = r.checkoutUrl;
        return;
      }
    } catch (err: any) {
      // checkout ainda não configurado → cai no modo manual abaixo
      if (!String(err.message).includes("checkout_not_configured")) {
        setPlanMsg(`Erro: ${err.message}`);
        return;
      }
    }

    // 2) fallback: ativação manual (enquanto o Mercado Pago não está configurado)
    if (!confirm(`Ativar o plano ${planName} (R$ ${price}/usuário/mês)?\n\nO pagamento automático ainda não está ligado. O plano será liberado manualmente.`)) return;
    try {
      await apiPut("/billing/plan", { plan: planKey }, token);
      const b = await apiGet("/billing", token);
      setBilling(b);
      setPlanMsg(`Plano ${planName} ativado! 🎉`);
    } catch (err: any) {
      setPlanMsg(`Erro: ${err.message}`);
    }
  }

  // White-label: cliente do parceiro assina um plano DO PARCEIRO (assinatura mensal recorrente)
  async function chooseResellerPlan(planId: string) {
    setPlanMsg("");
    try {
      const r = await apiPost("/billing/checkout-reseller", { planId }, token);
      if (r.checkoutUrl) {
        setPlanMsg("Redirecionando para o pagamento seguro…");
        window.location.href = r.checkoutUrl;
        return;
      }
    } catch (err: any) {
      const m = String(err?.message ?? "");
      if (m.includes("reseller_mp_not_connected")) setPlanMsg("O pagamento ainda não foi ativado pelo seu fornecedor. Fale com ele para liberar a assinatura.");
      else setPlanMsg(`Erro: ${m}`);
    }
  }

  async function saveWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    setWaLoading(true);
    setWaSaved(false);
    try {
      const body: any = { whatsappPhoneNumberId: waPhoneId };
      if (waToken.trim()) body.whatsappAccessToken = waToken.trim();
      const s = await apiPut("/settings", body, token);
      setHasToken(s.hasWhatsappToken);
      setWaToken("");
      setWaSaved(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWaLoading(false);
    }
  }

  async function saveInstagram(e: React.FormEvent) {
    e.preventDefault();
    setIgLoading(true);
    setIgSaved(false);
    try {
      const body: any = { instagramPageId: igPageId };
      if (igToken.trim()) body.instagramAccessToken = igToken.trim();
      const s = await apiPut("/settings", body, token);
      setHasIgToken(s.hasInstagramToken);
      setIgToken("");
      setIgSaved(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIgLoading(false);
    }
  }

  async function saveBrand(e: React.FormEvent) {
    e.preventDefault();
    setBrandMsg("");
    try {
      await apiPut("/settings", { brandName, brandColor, brandLogoUrl }, token);
      setBrandMsg("Marca salva! Recarregue o app para ver no cabeçalho. ✓");
    } catch (err: any) { setBrandMsg(`Erro: ${err.message}`); }
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgMsg("");
    try {
      await apiPost("/orgs", { name: newOrgName }, token);
      setNewOrgName("");
      const list = await apiGet("/orgs", token);
      setOrgs(list);
      setOrgMsg("Empresa criada! Use 'Entrar' para acessá-la.");
    } catch (err: any) { setOrgMsg(`Erro: ${err.message}`); }
  }

  async function switchOrg(orgId: string) {
    try {
      const d = await apiPost("/orgs/switch", { orgId }, token);
      saveAuth(d.token, d.user, d.orgId, d.role);
      location.reload();
    } catch (err: any) { alert(err.message); }
  }

  async function toggleAiAutoReply() {
    const next = !aiAutoReply;
    setAiAutoReply(next);
    try {
      await apiPut("/settings", { aiAutoReply: next }, token);
    } catch (err: any) {
      setAiAutoReply(!next);
      alert(err.message);
    }
  }

  async function ativarPush() {
    setPushMsg("");
    const r = await enablePush(token);
    if (r.ok) setPushMsg("Notificações ativadas neste dispositivo! 🔔");
    else if (r.reason === "server_not_configured") setPushMsg("Push ainda não configurado no servidor (faltam as chaves VAPID).");
    else if (r.reason === "denied") setPushMsg("Você negou a permissão de notificações no navegador.");
    else if (r.reason === "unsupported") setPushMsg("Este navegador não suporta notificações push.");
    else setPushMsg("Não foi possível ativar.");
  }

  async function deactivatePlan() {
    if (!confirm("Desativar o plano atual e voltar ao plano gratuito?\n\nRecursos pagos (como campanhas em massa) serão bloqueados.")) return;
    setPlanMsg("");
    try {
      await apiDelete("/billing/plan", token);
      const b = await apiGet("/billing", token);
      setBilling(b);
      setPlanMsg("Plano desativado. Sua conta voltou ao plano gratuito.");
    } catch (err: any) {
      setPlanMsg(`Erro: ${err.message}`);
    }
  }

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

  if (!isManager) {
    return (
      <Card>
        <div className="p-6 text-sm text-slate-500">
          As configurações são restritas a donos e gestores da conta.
        </div>
      </Card>
    );
  }

  const tabs = [
    { id: "plano", label: "Plano e cobrança" },
    { id: "canais", label: "Canais (WhatsApp/Instagram)" },
    { id: "ia", label: "IA & Notificações" },
    { id: "marca", label: "Marca" },
    { id: "equipe", label: "Equipe" },
    ...(isOwner ? [{ id: "revenda", label: "Revenda / Agência" }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Abas de organização */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-2xl border px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? "border-slate-900 bg-slate-900 text-white" : "hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Plano e cobrança */}
      {tab === "plano" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <CreditCard className="h-4 w-4" /> Plano e cobrança
          </div>
          {billing && (
            <div className="text-sm text-slate-500">
              Plano atual: <span className="font-medium text-slate-900">{billing.planName}</span>
              {billing.trialDaysLeft !== null && ` • ${billing.trialDaysLeft} dia(s) restante(s) de teste`}
              {" • "}{billing.usage.users}/{billing.limits.users >= 999 ? "∞" : billing.limits.users} usuários
              {" • "}{billing.usage.contacts}/{billing.limits.contacts >= 100000 ? "∞" : billing.limits.contacts} contatos
            </div>
          )}
        </div>
        <div className="p-4 pt-0">
          {/* Cliente de revenda assina os planos DO PARCEIRO; os demais, os planos da plataforma */}
          {billing && billing.resellerOrgId ? (
            billing.resellerPlans && billing.resellerPlans.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {billing.resellerPlans.map((p: any) => {
                  const isCurrent = billing.planName === p.name;
                  return (
                    <div key={p.id} className="rounded-2xl border p-4">
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-2 text-2xl font-bold">R$ {p.price}<span className="text-sm font-normal text-slate-500">/mês</span></div>
                      <ul className="mt-3 space-y-1 text-sm text-slate-600">
                        <li>• {p.users >= 999 ? "Usuários ilimitados" : `Até ${p.users} usuários`}</li>
                        <li>• {p.contacts >= 100000 ? "Contatos ilimitados" : `${Number(p.contacts).toLocaleString("pt-BR")} contatos`}</li>
                        <li>{p.ai ? "✅ Inteligência artificial" : "❌ Sem IA"}</li>
                        <li>{p.broadcast ? "✅ Campanhas em massa" : "❌ Sem campanhas em massa"}</li>
                      </ul>
                      <button
                        onClick={() => chooseResellerPlan(p.id)}
                        disabled={isCurrent}
                        className={`mt-4 w-full rounded-2xl py-2 text-sm font-medium transition ${isCurrent ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                      >
                        {isCurrent ? "Plano atual" : "Assinar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border p-4 text-sm text-slate-500">Seu fornecedor ainda não publicou planos. Em breve.</div>
            )
          ) : billing && (
            <div className="grid gap-3 md:grid-cols-3">
              {billing.plans.map((p: any) => {
                const isCurrent = billing.plan === p.key;
                const featured = p.key === "pro";
                return (
                  <div key={p.key} className={`rounded-2xl border p-4 ${featured ? "border-slate-900 ring-1 ring-slate-900" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{p.name}</div>
                      {featured && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Popular</span>}
                    </div>
                    <div className="mt-2 text-2xl font-bold">R$ {p.price}<span className="text-sm font-normal text-slate-500">/usuário/mês</span></div>
                    <ul className="mt-3 space-y-1 text-sm text-slate-600">
                      <li>• {p.users >= 999 ? "Usuários ilimitados" : `Até ${p.users} usuários`}</li>
                      <li>• {p.contacts >= 100000 ? "Contatos ilimitados" : `${p.contacts.toLocaleString("pt-BR")} contatos`}</li>
                      <li>• {p.automations >= 999 ? "Automações ilimitadas" : `${p.automations} automações`}</li>
                      <li>{p.broadcast ? "✅ Campanhas em massa" : "❌ Sem campanhas em massa"}</li>
                    </ul>
                    <button
                      onClick={() => choosePlan(p.key, p.name, p.price)}
                      disabled={isCurrent}
                      className={`mt-4 w-full rounded-2xl py-2 text-sm font-medium transition ${isCurrent ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                    >
                      {isCurrent ? "Plano atual" : "Ativar plano"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {planMsg && <div className={`mt-3 text-sm ${planMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{planMsg}</div>}
          {isOwner && billing && billing.plan !== "trial" && (
            <button onClick={deactivatePlan} className="mt-3 text-sm text-red-600 underline hover:text-red-700">
              Desativar plano atual (voltar ao gratuito)
            </button>
          )}
          <div className="mt-4 rounded-2xl border p-3 text-xs text-slate-500">
            💳 Pagamento recorrente seguro via <strong>Mercado Pago</strong> (cartão de crédito ou Pix). A assinatura renova automaticamente todo mês e pode ser cancelada a qualquer momento.
          </div>
        </div>
      </Card>
      )}

      {/* IA & Notificações */}
      {tab === "ia" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-violet-500" /> Inteligência e notificações
          </div>
          <div className="text-sm text-slate-500">Robô de IA e avisos em tempo real</div>
        </div>
        <div className="p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div className="pr-3">
              <div className="text-sm font-medium">Agente de IA autônomo (atende sozinho 24/7)</div>
              <div className="text-xs text-slate-500">A IA recebe, qualifica e responde os clientes sozinha no WhatsApp/Instagram, pontua cada lead automaticamente e avisa a equipe quando o cliente quer fechar ou falar com uma pessoa (passa a vez ao humano). Quando alguém "Assume" a conversa, o agente para. Requer ANTHROPIC_API_KEY e um canal conectado.</div>
            </div>
            <button
              onClick={toggleAiAutoReply}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${aiAutoReply ? "bg-green-500" : "bg-slate-300"}`}
              title={aiAutoReply ? "Desligar" : "Ligar"}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${aiAutoReply ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div className="pr-3">
              <div className="flex items-center gap-1 text-sm font-medium"><Bell className="h-3.5 w-3.5" /> Notificações push</div>
              <div className="text-xs text-slate-500">Receba um aviso no aparelho quando chegar lead ou mensagem novos, mesmo com o app fechado.</div>
            </div>
            <button onClick={ativarPush} disabled={!pushSupported()} className="shrink-0 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              Ativar neste aparelho
            </button>
          </div>
          {pushMsg && <div className="text-sm text-slate-600">{pushMsg}</div>}
        </div>
      </Card>
      )}

      {/* Marca (white-label) */}
      {tab === "marca" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Palette className="h-4 w-4 text-pink-500" /> Marca personalizada (white-label)
          </div>
          <div className="text-sm text-slate-500">Use sua própria marca. Ideal para revender o sistema como se fosse seu.</div>
        </div>
        <div className="p-4 pt-0">
          <form onSubmit={saveBrand} className="grid gap-3 md:grid-cols-2 max-w-2xl">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome exibido</label>
              <Input value={brandName} onChange={(e: any) => setBrandName(e.target.value)} placeholder="Ex.: Minha Empresa CRM" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cor de destaque</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-12 rounded-lg border" />
                <Input value={brandColor} onChange={(e: any) => setBrandColor(e.target.value)} placeholder="#38bdf8" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">URL do logo (opcional)</label>
              <Input value={brandLogoUrl} onChange={(e: any) => setBrandLogoUrl(e.target.value)} placeholder="https://.../meu-logo.png" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Salvar marca</button>
              {brandMsg && <span className={`text-sm ${brandMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{brandMsg}</span>}
            </div>
          </form>
        </div>
      </Card>
      )}

      {/* Empresas (revenda) */}
      {tab === "revenda" && isOwner && (
        <Card>
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4 text-blue-500" /> Empresas (revenda / agência)
            </div>
            <div className="text-sm text-slate-500">Gerencie várias empresas com o mesmo acesso. Crie uma conta para cada cliente e alterne entre elas.</div>
          </div>
          <div className="p-4 pt-0 space-y-3">
            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-700">🔗 Seu link de cadastro (com a sua marca)</div>
              <div className="mt-1 text-xs text-slate-500">Compartilhe este link. Quem se cadastrar por ele entra já com a SUA marca (logo, nome e cor) e fica vinculado a você. Nunca vê "Solutions".</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input readOnly value={brandLink} className="min-w-[220px] flex-1 rounded-xl border bg-white px-3 py-2 text-xs text-slate-600 outline-none" />
                <button
                  onClick={() => { navigator.clipboard?.writeText(brandLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  {linkCopied ? "Copiado! ✓" : "Copiar link"}
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">Dica: configure sua marca na aba <strong>Marca</strong> (logo, nome e cor) antes de divulgar.</div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-700">💬 Chat no seu site</div>
              <div className="mt-1 text-xs text-slate-500">Cole este código no seu site (antes do <code className="rounded bg-slate-200 px-1">&lt;/body&gt;</code>) e ganhe um chat com a SUA marca, ligado ao Inbox e aos seus Fluxos da IA.</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input readOnly value={widgetSnippet} onFocus={(e) => e.currentTarget.select()} className="min-w-[220px] flex-1 rounded-xl border bg-white px-3 py-2 text-xs text-slate-600 outline-none" />
                <button
                  onClick={() => { navigator.clipboard?.writeText(widgetSnippet); setSnippetCopied(true); setTimeout(() => setSnippetCopied(false), 2000); }}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  {snippetCopied ? "Copiado! ✓" : "Copiar código"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-medium text-slate-700">💳 Pagamentos (Mercado Pago)</div>
              {!mpStatus?.configured ? (
                <div className="mt-1 text-xs text-slate-500">A cobrança ainda não foi ativada na plataforma. Em breve.</div>
              ) : mpStatus?.connected ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-emerald-700">✅ Conta conectada. Seus clientes assinam e pagam <strong>você</strong> todo mês (assinatura recorrente). A taxa da Solutions é cobrada à parte (card abaixo).</div>
                  <button onClick={disconnectMp} className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Desconectar</button>
                </div>
              ) : (
                <>
                  <div className="mt-1 text-xs text-slate-500">Conecte sua conta Mercado Pago para receber as <strong>assinaturas mensais</strong> dos seus clientes automaticamente, na sua própria conta.</div>
                  <button onClick={connectMp} className="mt-2 rounded-xl px-3 py-2 text-xs font-medium text-white hover:opacity-90" style={{ backgroundColor: "#009ee3" }}>Conectar Mercado Pago</button>
                </>
              )}
            </div>

            {feeStatus?.configured && (
              <div className="rounded-2xl border bg-white p-3">
                <div className="text-sm font-medium text-slate-700">🏦 Taxa da plataforma (Solutions)</div>
                <div className="mt-1 text-xs text-slate-500">
                  Seus clientes pagam <strong>você</strong> 100% (assinatura mensal). A Solutions cobra <strong>{feeStatus.feePercent}%</strong> da sua receita como taxa da plataforma (cobrança mensal automática no seu Mercado Pago).
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    Comissão deste mês: <strong className="text-slate-900">R$ {feeStatus.amount}</strong>
                    <span className="text-slate-400"> ({feeStatus.feePercent}% da receita dos seus clientes)</span>
                  </div>
                  {feeStatus.status === "authorized" ? (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">✅ Autorizada</span>
                  ) : feeStatus.amount > 0 ? (
                    <button onClick={subscribeFee} className="rounded-xl px-3 py-2 text-xs font-medium text-white hover:opacity-90" style={{ backgroundColor: "#009ee3" }}>
                      {feeStatus.status ? "Reautorizar cobrança" : "Autorizar cobrança automática"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Sem clientes pagantes ainda</span>
                  )}
                </div>
                {feeStatus.status && feeStatus.status !== "authorized" && (
                  <div className="mt-1 text-[11px] text-amber-600">Status: {feeStatus.status}. Conclua a autorização no Mercado Pago.</div>
                )}
              </div>
            )}

            <div className="rounded-2xl border">
              <div className="border-b px-3 py-2 text-sm font-medium text-slate-600">💼 Seus planos ({rplans.length})</div>
              <div className="divide-y">
                {rplans.length === 0 && <div className="px-3 py-3 text-center text-xs text-slate-400">Crie planos com a SUA marca e preço pra oferecer aos seus clientes.</div>}
                {rplans.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{p.name} · <span className="text-emerald-700">R$ {p.price}/mês</span></div>
                      <div className="text-xs text-slate-500">{p.users} usuário(s) · {Number(p.contacts).toLocaleString("pt-BR")} contatos{p.ai ? " · IA" : ""}{p.broadcast ? " · Campanhas" : ""}</div>
                    </div>
                    <button onClick={() => deletePlan(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remover"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <form onSubmit={createPlan} className="space-y-2 border-t p-3">
                <div className="text-xs font-medium text-slate-600">Novo plano</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input placeholder="Nome do plano" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200" />
                  <input type="number" min={0} placeholder="Preço R$/mês" value={newPlan.price} onChange={(e) => setNewPlan((p) => ({ ...p, price: Number(e.target.value) }))} className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200" />
                  <input type="number" min={1} placeholder="Usuários" value={newPlan.users} onChange={(e) => setNewPlan((p) => ({ ...p, users: Number(e.target.value) }))} className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200" />
                  <input type="number" min={1} placeholder="Contatos" value={newPlan.contacts} onChange={(e) => setNewPlan((p) => ({ ...p, contacts: Number(e.target.value) }))} className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={newPlan.ai} onChange={(e) => setNewPlan((p) => ({ ...p, ai: e.target.checked }))} /> IA</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={newPlan.broadcast} onChange={(e) => setNewPlan((p) => ({ ...p, broadcast: e.target.checked }))} /> Campanhas em massa</label>
                  <button type="submit" disabled={planBusy || !newPlan.name.trim()} className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">Criar plano</button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border">
              <div className="border-b px-3 py-2 text-sm font-medium text-slate-600">Seus clientes pelo link ({clients.length})</div>
              <div className="divide-y">
                {clients.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-400">Nenhum cliente pelo seu link ainda. Compartilhe o link acima.</div>}
                {clients.map((c) => (
                  <div key={c.orgId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.planLabel || c.plan} · {c.users} acesso(s) · desde {new Date(c.createdAt).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <select
                      value=""
                      onChange={(e) => assignPlan(c.orgId, e.target.value === "__none" ? "" : e.target.value)}
                      className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-slate-200"
                      title="Atribuir um plano a este cliente"
                    >
                      <option value="">Atribuir plano…</option>
                      {rplans.map((p) => <option key={p.id} value={p.id}>{p.name} · R$ {p.price}/mês</option>)}
                      <option value="__none">↩︎ Voltar ao teste grátis</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Multi-empresa (alternar manualmente)</div>
            <div className="space-y-2">
              {orgs.map((o) => (
                <div key={o.orgId} className="flex items-center justify-between rounded-2xl border p-3">
                  <div>
                    <div className="font-medium">{o.name} {o.current && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">atual</span>}</div>
                    <div className="text-xs text-slate-500">Plano: {o.plan} • papel: {roleLabel[o.role] ?? o.role}</div>
                  </div>
                  {!o.current && (
                    <button onClick={() => switchOrg(o.orgId)} className="rounded-2xl border px-3 py-1.5 text-sm hover:bg-slate-50">Entrar</button>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={createOrg} className="flex flex-wrap items-end gap-2 rounded-2xl border p-3">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-sm font-medium">Nova empresa (cliente)</label>
                <Input value={newOrgName} onChange={(e: any) => setNewOrgName(e.target.value)} placeholder="Nome da empresa do cliente" />
              </div>
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Criar empresa</button>
            </form>
            {orgMsg && <div className={`text-sm ${orgMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{orgMsg}</div>}
          </div>
        </Card>
      )}

      {/* WhatsApp */}
      {tab === "canais" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Phone className="h-4 w-4" /> Conexão WhatsApp (Meta Cloud API)
          </div>
          <div className="text-sm text-slate-500">
            Cole aqui as credenciais geradas em developers.facebook.com → seu app → WhatsApp → Configuração da API
          </div>
        </div>
        <div className="p-4 pt-0">
          <form onSubmit={saveWhatsApp} className="space-y-3 max-w-xl">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number ID</label>
              <Input value={waPhoneId} onChange={(e: any) => setWaPhoneId(e.target.value)} placeholder="ex.: 123456789012345" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Token de acesso {hasToken && <span className="ml-1 inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> configurado</span>}
              </label>
              <Input type="password" value={waToken} onChange={(e: any) => setWaToken(e.target.value)} placeholder={hasToken ? "•••••• (preencha só para substituir)" : "EAAxxxxxxx…"} />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={waLoading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                {waLoading ? "Salvando…" : "Salvar conexão"}
              </button>
              {waSaved && <span className="text-sm text-green-600">Salvo! ✓</span>}
            </div>
          </form>
          <div className="mt-4 rounded-2xl border p-3 text-xs text-slate-500 max-w-xl">
            Webhook para configurar na Meta: <code className="rounded bg-slate-100 px-1">https://solutions-api.onrender.com/webhooks/meta</code><br />
            Token de verificação: <code className="rounded bg-slate-100 px-1">solutions_verify</code> • Campo a assinar: <code className="rounded bg-slate-100 px-1">messages</code>
          </div>
        </div>
      </Card>
      )}

      {/* Instagram */}
      {tab === "canais" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Instagram className="h-4 w-4" /> Conexão Instagram (Messaging API)
          </div>
          <div className="text-sm text-slate-500">
            Requer conta profissional vinculada a uma Página do Facebook. Token gerado no mesmo app da Meta, produto "Messenger/Instagram".
          </div>
        </div>
        <div className="p-4 pt-0">
          <form onSubmit={saveInstagram} className="space-y-3 max-w-xl">
            <div>
              <label className="mb-1 block text-sm font-medium">Page ID (página do Facebook vinculada)</label>
              <Input value={igPageId} onChange={(e: any) => setIgPageId(e.target.value)} placeholder="ex.: 109876543210987" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Token de acesso da página {hasIgToken && <span className="ml-1 inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> configurado</span>}
              </label>
              <Input type="password" value={igToken} onChange={(e: any) => setIgToken(e.target.value)} placeholder={hasIgToken ? "•••••• (preencha só para substituir)" : "EAAxxxxxxx…"} />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={igLoading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                {igLoading ? "Salvando…" : "Salvar conexão"}
              </button>
              {igSaved && <span className="text-sm text-green-600">Salvo! ✓</span>}
            </div>
          </form>
        </div>
      </Card>
      )}

      {/* Equipe */}
      {tab === "equipe" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-4 w-4" /> Equipe e acessos
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

          <form onSubmit={addMember} className="rounded-2xl border p-4">
            <div className="mb-3 text-sm font-medium">Novo acesso</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input required value={newMember.name} onChange={(e: any) => setNewMember((p) => ({ ...p, name: e.target.value }))} placeholder="Nome" />
              <Input required type="email" value={newMember.email} onChange={(e: any) => setNewMember((p) => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
              <Input required type="text" value={newMember.password} onChange={(e: any) => setNewMember((p) => ({ ...p, password: e.target.value }))} placeholder="Senha inicial (8+ chars, letras e números)" />
              <select
                value={newMember.role}
                onChange={(e) => setNewMember((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="agent">Vendedor</option>
                <option value="admin">Gerente</option>
                <option value="partner">Sócio</option>
                <option value="viewer">Somente visualização</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Criar acesso
              </button>
              {teamMsg && <span className={`text-sm ${teamMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{teamMsg}</span>}
            </div>
          </form>
        </div>
      </Card>
      )}
    </div>
  );
}
