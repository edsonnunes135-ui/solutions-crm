import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const billingRouter = Router();
billingRouter.use(requireAuth);

export const PLANS: Record<string, { name: string; price: number; users: number; contacts: number; automations: number; broadcast: boolean }> = {
  trial:    { name: "Teste grátis", price: 0,   users: 3,   contacts: 500,    automations: 5,   broadcast: true },
  starter:  { name: "Starter",      price: 49,  users: 2,   contacts: 1000,   automations: 5,   broadcast: false },
  pro:      { name: "Pro",          price: 99,  users: 10,  contacts: 10000,  automations: 50,  broadcast: true },
  business: { name: "Business",     price: 197, users: 999, contacts: 100000, automations: 999, broadcast: true },
};

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
    limits: { users: plan.users, contacts: plan.contacts, automations: plan.automations, broadcast: plan.broadcast },
    usage: { users, contacts, automations },
    plans: Object.entries(PLANS)
      .filter(([k]) => k !== "trial")
      .map(([key, p]) => ({ key, ...p })),
  });
});

const PlanBody = z.object({ plan: z.enum(["starter", "pro", "business"]) });

/**
 * Troca de plano manual (CEO/Sócio). Quando a cobrança automática (Stripe /
 * Mercado Pago) for plugada, este endpoint passa a ser chamado pelo webhook
 * de pagamento confirmado.
 */
billingRouter.put("/billing/plan", requireRole("owner", "partner"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { plan: parsed.data.plan },
  });
  res.json({ ok: true, plan: org.plan });
});
