import React, { useEffect, useState } from "react";
import { Palette, Building2, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { getUser, saveAuth } from "../lib/auth";
import { roleLabel } from "../lib/roles";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}
function Input(props: any) {
  return <input {...props} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${props.className ?? ""}`} />;
}

/**
 * Marca própria (white-label) + Revenda / Agência.
 * Antes vivia dentro de Configurações; virou tela própria (grupo Gestão).
 * A marca é para qualquer gestor; o bloco de revenda é só do dono (owner).
 */
export default function MarcaRevendaView({ token }: { token: string }) {
  const isOwner = getUser()?.role === "owner";
  const myOrgId = getUser()?.orgId ?? "";
  const brandLink = typeof window !== "undefined" ? `${window.location.origin}/?marca=${myOrgId}` : "";
  const widgetSnippet = `<script src="https://solutions-api.onrender.com/widget.js" data-org="${myOrgId}"></script>`;

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

  // Planos do parceiro
  const [rplans, setRplans] = useState<any[]>([]);
  const [newPlan, setNewPlan] = useState({ name: "", price: 0, users: 2, contacts: 1000, automations: 5, broadcast: false, ai: false });
  const [planBusy, setPlanBusy] = useState(false);

  const [mpStatus, setMpStatus] = useState<any>(null);
  const [feeStatus, setFeeStatus] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    apiGet("/settings", token).then((s) => {
      if (s.brandName) setBrandName(s.brandName);
      if (s.brandColor) setBrandColor(s.brandColor);
      if (s.brandLogoUrl) setBrandLogoUrl(s.brandLogoUrl);
    }).catch(() => {});
    if (!isOwner) return;
    apiGet("/orgs", token).then(setOrgs).catch(() => {});
    apiGet("/reseller/clients", token).then(setClients).catch(() => {});
    apiGet("/reseller/plans", token).then(setRplans).catch(() => {});
    apiGet("/reseller/mp/status", token).then(setMpStatus).catch(() => {});
    apiGet("/reseller/platform-fee/status", token).then(setFeeStatus).catch(() => {});
    apiGet("/api-keys", token).then((k) => setApiKeys(Array.isArray(k) ? k : [])).catch(() => {});
    apiGet("/webhooks", token).then((w) => setWebhooks(Array.isArray(w) ? w : [])).catch(() => {});
  }, [token, isOwner]);

  async function saveBrand(e: React.FormEvent) {
    e.preventDefault();
    setBrandMsg("");
    try {
      await apiPut("/settings", { brandName, brandColor, brandLogoUrl }, token);
      setBrandMsg("Marca salva! Recarregue o app para ver no cabeçalho. ✓");
    } catch (err: any) { setBrandMsg(`Erro: ${err.message}`); }
  }

  async function genApiKey() {
    const name = window.prompt("Nome da chave (ex.: Make, N8N):", "");
    if (!name) return;
    try {
      const r = await apiPost("/api-keys", { name }, token);
      if (r?.key) { setNewKey(r.key); setApiKeys(await apiGet("/api-keys", token)); }
    } catch { alert("Não foi possível gerar a chave."); }
  }
  async function delApiKey(id: string) {
    if (!confirm("Revogar esta chave? Integrações que a usam vão parar de funcionar.")) return;
    await apiDelete(`/api-keys/${id}`, token);
    setApiKeys(await apiGet("/api-keys", token));
  }
  async function addWebhook() {
    const url = webhookUrl.trim();
    if (!url) return;
    try {
      await apiPost("/webhooks", { url }, token);
      setWebhookUrl("");
      setWebhooks(await apiGet("/webhooks", token));
    } catch { alert("URL inválida ou não foi possível adicionar."); }
  }
  async function delWebhook(id: string) {
    await apiDelete(`/webhooks/${id}`, token);
    setWebhooks(await apiGet("/webhooks", token));
  }

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
    } catch { /* ignore */ } finally { setPlanBusy(false); }
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

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgMsg("");
    try {
      await apiPost("/orgs", { name: newOrgName }, token);
      setNewOrgName("");
      setOrgs(await apiGet("/orgs", token));
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><Palette className="h-5 w-5 text-pink-500" /> Marca & Revenda</h1>
        <p className="mt-1 text-sm text-slate-500">Sua marca própria (white-label) e a operação de revenda / agência.</p>
      </div>

      {/* Marca (white-label) */}
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

      {/* Empresas (revenda) — só dono */}
      {isOwner && (
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
              <div className="mt-2 text-[11px] text-slate-400">Dica: configure sua marca no card acima (logo, nome e cor) antes de divulgar.</div>
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
              <div className="text-sm font-medium text-slate-700">🔌 Integrações (API + Webhooks)</div>
              <div className="mt-1 text-xs text-slate-500">Conecte ao Make, N8N, Zapier. Gere uma chave e use <code className="rounded bg-slate-100 px-1">POST https://solutions-api.onrender.com/api/v1/contacts</code> com o header <code className="rounded bg-slate-100 px-1">Authorization: Bearer SUA_CHAVE</code>.</div>

              {newKey && (
                <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 p-2 text-xs">
                  <div className="font-medium text-emerald-800">⚠️ Guarde esta chave agora — ela só aparece uma vez:</div>
                  <div className="mt-1 flex items-center gap-2">
                    <input readOnly value={newKey} onFocus={(e) => e.currentTarget.select()} className="flex-1 rounded-lg border bg-white px-2 py-1 font-mono text-[11px]" />
                    <button onClick={() => { navigator.clipboard?.writeText(newKey); }} className="rounded-lg bg-slate-900 px-2 py-1 text-white">Copiar</button>
                    <button onClick={() => setNewKey("")} className="rounded-lg border px-2 py-1">Ok</button>
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Chaves de API ({apiKeys.length})</span>
                <button onClick={genApiKey} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800">+ Gerar chave</button>
              </div>
              <div className="mt-1 space-y-1">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg border px-2 py-1 text-xs">
                    <span className="truncate"><strong>{k.name}</strong> · <span className="font-mono text-slate-500">{k.prefix}…</span></span>
                    <button onClick={() => delApiKey(k.id)} className="shrink-0 text-red-500 hover:text-red-700">Revogar</button>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs font-medium text-slate-600">Webhooks de saída ({webhooks.length})</div>
              <div className="text-[11px] text-slate-400">A Solutions avisa essa URL quando chega mensagem ou novo contato.</div>
              <div className="mt-1 flex gap-2">
                <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hook.make.com/..." className="flex-1 rounded-lg border px-2 py-1 text-xs outline-none" />
                <button onClick={addWebhook} className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50">Adicionar</button>
              </div>
              <div className="mt-1 space-y-1">
                {webhooks.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border px-2 py-1 text-xs">
                    <span className="truncate text-slate-600">{h.url}</span>
                    <button onClick={() => delWebhook(h.id)} className="shrink-0 text-red-500 hover:text-red-700">Remover</button>
                  </div>
                ))}
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
    </div>
  );
}
