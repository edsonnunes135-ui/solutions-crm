/**
 * White-label split de pagamento (Mercado Pago Marketplace).
 * O parceiro conecta a conta MP dele (OAuth). Quando um cliente assina um plano
 * do parceiro, o checkout vai pra conta do parceiro com `marketplace_fee` = a
 * comissão da Solutions (MARKETPLACE_FEE_PERCENT). Degrada sem MP_CLIENT_ID.
 * Requer env: MP_CLIENT_ID, MP_CLIENT_SECRET, MARKETPLACE_FEE_PERCENT (default 30).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const resellerPayRouter = Router();
resellerPayRouter.use(requireAuth);

const MP_CLIENT_ID = process.env.MP_CLIENT_ID || "";
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";
const FEE_PERCENT = Number(process.env.MARKETPLACE_FEE_PERCENT || "30");
const PUBLIC_API = process.env.PUBLIC_API_URL || "https://solutions-api.onrender.com";
const PUBLIC_WEB = process.env.PUBLIC_WEB_URL || "https://solutionscrm.com.br";
const REDIRECT_URI = `${PUBLIC_API}/reseller/mp/callback`;

// Status da conexão Mercado Pago do parceiro
resellerPayRouter.get("/reseller/mp/status", async (req: AuthedRequest, res) => {
  const s = await prisma.orgSetting.findUnique({
    where: { orgId: req.user!.orgId },
    select: { mpAccessToken: true, mpConnectedAt: true },
  });
  res.json({
    configured: !!(MP_CLIENT_ID && MP_CLIENT_SECRET),
    connected: !!s?.mpAccessToken,
    since: s?.mpConnectedAt ?? null,
    feePercent: FEE_PERCENT,
  });
});

// Gera a URL pra o parceiro conectar a conta Mercado Pago (OAuth)
resellerPayRouter.get("/reseller/mp/connect-url", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) return res.status(503).json({ error: "mp_marketplace_not_configured" });
  const url = `https://auth.mercadopago.com/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${req.user!.orgId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.json({ url });
});

// Desconectar a conta MP do parceiro
resellerPayRouter.delete("/reseller/mp", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  await prisma.orgSetting.updateMany({
    where: { orgId: req.user!.orgId },
    data: { mpAccessToken: null, mpRefreshToken: null, mpUserId: null, mpConnectedAt: null },
  });
  res.json({ ok: true });
});

// Cliente assina um plano do parceiro dele — ASSINATURA MENSAL recorrente na conta do parceiro.
// Modelo atacado: o parceiro recebe 100% do cliente todo mês; a comissão da Solutions é
// cobrada à parte, do parceiro (ver /reseller/platform-fee/*). O MP não permite split
// automático em assinatura recorrente pelo fluxo self-service — por isso o modelo atacado.
const CheckoutBody = z.object({ planId: z.string().min(1) });
resellerPayRouter.post("/billing/checkout-reseller", async (req: AuthedRequest, res) => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId }, select: { resellerOrgId: true } });
  if (!org?.resellerOrgId) return res.status(400).json({ error: "no_reseller" });

  const plan = await prisma.resellerPlan.findFirst({ where: { id: parsed.data.planId, resellerOrgId: org.resellerOrgId, active: true } });
  if (!plan) return res.status(404).json({ error: "plan_not_found" });
  if (plan.price <= 0) return res.status(400).json({ error: "plan_is_free" });

  const rs = await prisma.orgSetting.findUnique({ where: { orgId: org.resellerOrgId }, select: { mpAccessToken: true } });
  if (!rs?.mpAccessToken) return res.status(503).json({ error: "reseller_mp_not_connected" });

  const payer = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { email: true } });
  try {
    const r = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rs.mpAccessToken}` },
      body: JSON.stringify({
        reason: `Plano ${plan.name}`,
        external_reference: `${req.user!.orgId}:${plan.id}`,
        payer_email: payer?.email,
        back_url: `${PUBLIC_WEB}/?assinatura=ok`,
        notification_url: `${PUBLIC_API}/webhooks/mercadopago`,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.price, currency_id: "BRL" },
        status: "pending",
      }),
    });
    const data: any = await r.json();
    if (!r.ok) return res.status(502).json({ error: "mp_error", detail: data?.message ?? data });
    if (data.id) await prisma.organization.update({ where: { id: req.user!.orgId }, data: { mpPreapprovalId: String(data.id) } });
    res.json({ ok: true, checkoutUrl: data.init_point ?? data.sandbox_init_point, amount: plan.price });
  } catch (err: any) {
    res.status(502).json({ error: "mp_request_failed", detail: String(err?.message ?? err) });
  }
});

// ─── Taxa da plataforma (modelo atacado) — o PARCEIRO paga a comissão à Solutions ───

// Comissão mensal = FEE_PERCENT% da soma dos planos pagos dos clientes deste parceiro.
async function computePlatformFee(resellerOrgId: string): Promise<number> {
  const clients = await prisma.organization.findMany({
    where: { resellerOrgId, planPrice: { not: null } },
    select: { planPrice: true },
  });
  const base = clients.reduce((sum, c) => sum + (c.planPrice || 0), 0);
  return Math.round(base * (FEE_PERCENT / 100));
}

// Status da taxa da plataforma (quanto o parceiro deve por mês + se já autorizou)
resellerPayRouter.get("/reseller/platform-fee/status", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const platformToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  const amount = await computePlatformFee(req.user!.orgId);
  const s = await prisma.orgSetting.findUnique({
    where: { orgId: req.user!.orgId },
    select: { platformFeePreapprovalId: true, platformFeeStatus: true, platformFeeAmount: true },
  });

  let status = s?.platformFeeStatus ?? null;
  // se já existe assinatura, confere o status real no MP (conta da plataforma)
  if (s?.platformFeePreapprovalId && platformToken) {
    try {
      const r = await fetch(`https://api.mercadopago.com/preapproval/${s.platformFeePreapprovalId}`, {
        headers: { Authorization: `Bearer ${platformToken}` },
      });
      if (r.ok) {
        const sub: any = await r.json();
        status = sub.status ?? status;
        if (status !== s.platformFeeStatus) {
          await prisma.orgSetting.update({ where: { orgId: req.user!.orgId }, data: { platformFeeStatus: status } }).catch(() => {});
        }
      }
    } catch { /* ignora */ }
  }

  res.json({
    configured: !!platformToken,
    feePercent: FEE_PERCENT,
    amount, // comissão mensal calculada agora
    subscribedAmount: s?.platformFeeAmount ?? null, // valor da assinatura ativa
    status, // null = nunca autorizou
  });
});

// Parceiro autoriza a cobrança recorrente da taxa da plataforma
resellerPayRouter.post("/reseller/platform-fee/subscribe", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const platformToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  if (!platformToken) return res.status(503).json({ error: "platform_mp_not_configured" });

  const amount = await computePlatformFee(req.user!.orgId);
  if (amount <= 0) return res.status(400).json({ error: "no_paying_clients" });

  const payer = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { email: true } });
  try {
    const r = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${platformToken}` },
      body: JSON.stringify({
        reason: "Solutions CRM — Taxa da plataforma (white-label)",
        external_reference: `platformfee:${req.user!.orgId}`,
        payer_email: payer?.email,
        back_url: `${PUBLIC_WEB}/?taxa=ok`,
        notification_url: `${PUBLIC_API}/webhooks/mercadopago`,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: amount, currency_id: "BRL" },
        status: "pending",
      }),
    });
    const data: any = await r.json();
    if (!r.ok) return res.status(502).json({ error: "mp_error", detail: data?.message ?? data });
    await prisma.orgSetting.upsert({
      where: { orgId: req.user!.orgId },
      update: { platformFeePreapprovalId: String(data.id ?? ""), platformFeeStatus: "pending", platformFeeAmount: amount },
      create: { orgId: req.user!.orgId, platformFeePreapprovalId: String(data.id ?? ""), platformFeeStatus: "pending", platformFeeAmount: amount },
    });
    res.json({ ok: true, checkoutUrl: data.init_point ?? data.sandbox_init_point, amount });
  } catch (err: any) {
    res.status(502).json({ error: "mp_request_failed", detail: String(err?.message ?? err) });
  }
});
