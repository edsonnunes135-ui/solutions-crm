import React, { useEffect, useState } from "react";
import { Phone, Instagram, UserPlus, Trash2, CheckCircle2, CreditCard, Sparkles, Bell, Palette, Building2 } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { getUser, saveAuth } from "../lib/auth";
import { enablePush, pushSupported } from "../lib/push";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}

function Input(props: any) {
  return <input {...props} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${props.className ?? ""}`} />;
}

const roleLabel: Record<string, string> = {
  owner: "CEO e Founder",
  partner: "Sócio",
  admin: "Gestor",
  agent: "Vendedor",
  viewer: "Visualização",
};

// Modelos de funil prontos por segmento — 1 clique e o funil já está montado.
const NICHE_TEMPLATES: { id: string; emoji: string; name: string; desc: string; stages: string[] }[] = [
  { id: "clinica", emoji: "🩺", name: "Clínica / Saúde & Estética", desc: "Da avaliação ao pós-atendimento.", stages: ["Novo contato", "Avaliação agendada", "Compareceu", "Em tratamento", "Concluído", "Não compareceu"] },
  { id: "imobiliaria", emoji: "🏠", name: "Imobiliária", desc: "Do lead à assinatura do contrato.", stages: ["Lead", "Visita agendada", "Visita realizada", "Proposta", "Fechado", "Perdido"] },
  { id: "ecommerce", emoji: "🛒", name: "E-commerce / Loja online", desc: "Do interesse à recompra.", stages: ["Interesse", "Negociando", "Aguardando pagamento", "Pago", "Recompra", "Perdido"] },
  { id: "servicos", emoji: "💼", name: "Serviços / Agência", desc: "Da proposta ao contrato.", stages: ["Lead", "Diagnóstico", "Proposta enviada", "Negociação", "Contrato fechado", "Perdido"] },
  { id: "educacao", emoji: "🎓", name: "Educação / Cursos", desc: "Do interessado ao aluno ativo.", stages: ["Interessado", "Aula experimental", "Matrícula", "Aluno ativo", "Desistiu"] },
  { id: "alimentacao", emoji: "🍔", name: "Restaurante / Delivery", desc: "Do 1º pedido à fidelização.", stages: ["Novo cliente", "Primeiro pedido", "Cliente recorrente", "Fiel", "Inativo"] },
];

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

  // Templates por nicho
  const [tplBusy, setTplBusy] = useState("");
  const [tplMsg, setTplMsg] = useState("");

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

  async function applyTemplate(tpl: typeof NICHE_TEMPLATES[number]) {
    if (!confirm(`Criar o funil "${tpl.name}"?\n\nEtapas: ${tpl.stages.join(" → ")}`)) return;
    setTplBusy(tpl.id);
    setTplMsg("");
    try {
      await apiPost("/pipelines", { name: tpl.name, kind: "sales", stages: tpl.stages.map((name) => ({ name })) }, token);
      setTplMsg(`✅ Funil "${tpl.name}" criado! Abra a aba Funil para ver.`);
    } catch (err: any) {
      setTplMsg(`Erro: ${err.message}`);
    } finally {
      setTplBusy("");
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
    { id: "templates", label: "Templates" },
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
          {billing && (
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

      {/* Templates por nicho */}
      {tab === "templates" && (
      <Card>
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-sky-500" /> Templates por nicho
          </div>
          <div className="text-sm text-slate-500">Comece com um funil pronto para o seu segmento. Configure em 1 clique.</div>
        </div>
        <div className="p-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NICHE_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="flex flex-col rounded-2xl border p-4">
                <div className="text-2xl">{tpl.emoji}</div>
                <div className="mt-1 font-semibold">{tpl.name}</div>
                <div className="mt-1 text-xs text-slate-500">{tpl.desc}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tpl.stages.map((s) => (
                    <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{s}</span>
                  ))}
                </div>
                <button
                  onClick={() => applyTemplate(tpl)}
                  disabled={tplBusy === tpl.id}
                  className="mt-3 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {tplBusy === tpl.id ? "Aplicando…" : "Usar este modelo"}
                </button>
              </div>
            ))}
          </div>
          {tplMsg && <div className={`mt-3 text-sm ${tplMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{tplMsg}</div>}
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
                <option value="admin">Gestor</option>
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
