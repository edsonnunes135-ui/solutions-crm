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

// Cliente assina um plano do parceiro dele — checkout com split automático
const CheckoutBody = z.object({ planId: z.string().min(1) });
resellerPayRouter.post("/billing/checkout-reseller", async (req: AuthedRequest, res) => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const org = await prisma.organization.findUnique({ where: { id: req.user!.orgId }, select: { resellerOrgId: true } });
  if (!org?.resellerOrgId) return res.status(400).json({ error: "no_reseller" });

  const plan = await prisma.resellerPlan.findFirst({ where: { id: parsed.data.planId, resellerOrgId: org.resellerOrgId, active: true } });
  if (!plan) return res.status(404).json({ error: "plan_not_found" });

  const rs = await prisma.orgSetting.findUnique({ where: { orgId: org.resellerOrgId }, select: { mpAccessToken: true } });
  if (!rs?.mpAccessToken) return res.status(503).json({ error: "reseller_mp_not_connected" });

  const fee = Math.round(plan.price * (FEE_PERCENT / 100) * 100) / 100; // comissão da Solutions
  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${rs.mpAccessToken}` },
      body: JSON.stringify({
        items: [{ title: `Plano ${plan.name}`, quantity: 1, unit_price: plan.price, currency_id: "BRL" }],
        marketplace_fee: fee,
        back_urls: {
          success: `${PUBLIC_WEB}/?assinatura=ok`,
          pending: `${PUBLIC_WEB}/?assinatura=pendente`,
          failure: `${PUBLIC_WEB}/?assinatura=falhou`,
        },
        external_reference: `${req.user!.orgId}:${plan.id}`,
        notification_url: `${PUBLIC_API}/webhooks/mercadopago`,
      }),
    });
    const data: any = await r.json();
    if (!r.ok) return res.status(502).json({ error: "mp_error", detail: data?.message ?? data });
    res.json({ ok: true, checkoutUrl: data.init_point ?? data.sandbox_init_point, amount: plan.price, fee });
  } catch (err: any) {
    res.status(502).json({ error: "mp_request_failed", detail: String(err?.message ?? err) });
  }
});
