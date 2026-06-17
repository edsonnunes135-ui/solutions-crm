import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { requirePlatformAdmin } from "../lib/platformAdmin";

export const billingRouter = Router();
billingRouter.use(requireAuth);

export const PLANS: Record<string, { name: string; price: number; users: number; contacts: number; automations: number; broadcast: boolean; ai: boolean }> = {
  trial:    { name: "Teste grátis", price: 0,   users: 3,   contacts: 500,    automations: 5,   broadcast: true,  ai: true },
  starter:  { name: "Starter",      price: 49,  users: 2,   contacts: 1000,   automations: 5,   broadcast: false, ai: false },
  pro:      { name: "Pro",          price: 99,  users: 10,  contacts: 10000,  automations: 50,  broadcast: true,  ai: true },
  business: { name: "Business",     price: 197, users: 999, contacts: 100000, automations: 999, broadcast: true,  ai: true },
};

/** Retorna o plano (com limites) de uma organização. Usado para travar recursos por plano. */
export async function planForOrg(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  return PLANS[org?.plan ?? "trial"] ?? PLANS.trial;
}

billingRouter.get("/billing", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: "org_not_found" });

  const [users, contacts, automations] = await Promise.all([
    prisma.membership.count({ where: { orgId } }),
    prisma.contact.count({ where: { orgId } }),
    prisma.automation.count({ where: { orgId } }),
  ]);

  const plan = PLANS[org.plan] ?? PLANS.trial;
  const trialDaysLeft = org.plan === "trial" && org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 86400000))
    : null;

  res.json({
    plan: org.plan,
    planName: plan.name,
    price: plan.price,
    trialEndsAt: org.trialEndsAt,
    trialDaysLeft,
    limits: { users: plan.users, contacts: plan.contacts, automations: plan.automations, broadcast: plan.broadcast, ai: plan.ai },
    usage: { users, contacts, automations },
    plans: Object.entries(PLANS)
      .filter(([k]) => k !== "trial")
      .map(([key, p]) => ({ key, ...p })),
  });
});

const PlanBody = z.object({ plan: z.enum(["starter", "pro", "business"]) });

const PUBLIC_WEB = process.env.PUBLIC_WEB_URL || "https://solutions-web.onrender.com";
const PUBLIC_API = process.env.PUBLIC_API_URL || "https://solutions-api.onrender.com";

/**
 * Cria uma assinatura recorrente no Mercado Pago para o plano escolhido e
 * devolve o link de checkout (init_point). O valor é o preço do plano
 * multiplicado pelo número de usuários da organização.
 * Requer a env var MERCADOPAGO_ACCESS_TOKEN (token de produção do dono da plataforma).
 */
billingRouter.post("/billing/checkout", requireRole("owner", "partner"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: "checkout_not_configured", note: "Configure MERCADOPAGO_ACCESS_TOKEN no servidor." });

  const plan = PLANS[parsed.data.plan];
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { email: true } });
  const users = await prisma.membership.count({ where: { orgId } });
  const amount = plan.price * Math.max(1, users);

  try {
    const r = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        reason: `Solutions CRM — Plano ${plan.name} (${users} usuário(s))`,
        external_reference: `${orgId}:${parsed.data.plan}`,
        payer_email: user?.email,
        back_url: `${PUBLIC_WEB}/?assinatura=ok`,
        notification_url: `${PUBLIC_API}/webhooks/mercadopago`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amount,
          currency_id: "BRL",
        },
        status: "pending",
      }),
    });
    const data: any = await r.json();
    if (!r.ok) return res.status(502).json({ error: "mp_error", detail: data?.message ?? data });

    res.json({ ok: true, checkoutUrl: data.init_point ?? data.sandbox_init_point, amount });
  } catch (err: any) {
    res.status(502).json({ error: "mp_request_failed", detail: String(err?.message ?? err) });
  }
});

/**
 * Ativação de plano SEM pagamento — exclusiva do CEO da plataforma.
 * O gestor comum NÃO usa isto: ele assina pagando via /billing/checkout
 * (Mercado Pago). Assim, "ativar plano de graça" é poder só do CEO.
 */
billingRouter.put("/billing/plan", requirePlatformAdmin, async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { plan: parsed.data.plan },
  });
  res.json({ ok: true, plan: org.plan });
});

// Desativar plano (volta ao gratuito) — exclusivo do CEO e Founder
billingRouter.delete("/billing/plan", requireRole("owner"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { plan: "trial", trialEndsAt: null },
  });
  res.json({ ok: true, plan: org.plan });
});
