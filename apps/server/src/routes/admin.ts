/**
 * Painel da PLATAFORMA (Solutions) — exclusivo do CEO.
 * Mostra o faturamento da Solutions como empresa de software (MRR vindo das
 * assinaturas), quantas empresas compraram e a distribuição de planos.
 * NUNCA expõe o faturamento interno das empresas-clientes (vendas delas) — só
 * o que cada uma paga de assinatura. Essa é a linha de privacidade do produto.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { isPlatformAdminEmail, requirePlatformAdmin } from "../lib/platformAdmin";
import { PLANS } from "./billing";

export const adminRouter = Router();
adminRouter.use(requireAuth);

// Qualquer logado pode perguntar SE é CEO (a UI usa isso pra mostrar/ocultar a aba)
adminRouter.get("/admin/status", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true },
  });
  res.json({ isPlatformAdmin: isPlatformAdminEmail(user?.email) });
});

// Faturamento da Solutions — só o CEO
adminRouter.get("/admin/metrics", requirePlatformAdmin, async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      createdAt: true,
      trialEndsAt: true,
      _count: { select: { users: true } },
      setting: { select: { brandName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const planCounts: Record<string, number> = { trial: 0, starter: 0, pro: 0, business: 0 };
  let mrr = 0;
  let activeSubscriptions = 0;
  let newThisMonth = 0;
  let totalUsers = 0;

  const companies = orgs.map((o) => {
    const plan = PLANS[o.plan] ?? PLANS.trial;
    const seats = Math.max(1, o._count.users);
    const monthly = o.plan === "trial" ? 0 : plan.price * seats;
    planCounts[o.plan] = (planCounts[o.plan] ?? 0) + 1;
    totalUsers += o._count.users;
    if (o.plan !== "trial") {
      mrr += monthly;
      activeSubscriptions += 1;
    }
    if (o.createdAt >= monthStart) newThisMonth += 1;
    return {
      id: o.id,
      name: o.setting?.brandName || o.name,
      plan: o.plan,
      planName: plan.name,
      seats: o._count.users,
      monthly,
      createdAt: o.createdAt,
      trialEndsAt: o.trialEndsAt,
    };
  });

  res.json({
    mrr,
    arr: mrr * 12,
    totalCompanies: orgs.length,
    activeSubscriptions,
    trialCount: planCounts.trial,
    newThisMonth,
    totalUsers,
    planCounts,
    plans: Object.entries(PLANS).map(([key, p]) => ({ key, name: p.name, price: p.price })),
    companies,
  });
});

// CEO pode trocar o plano de QUALQUER empresa (ativação manual / suporte)
const SetPlan = z.object({ plan: z.enum(["trial", "starter", "pro", "business"]) });
adminRouter.put("/admin/orgs/:orgId/plan", requirePlatformAdmin, async (req: AuthedRequest, res) => {
  const parsed = SetPlan.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const org = await prisma.organization.update({
    where: { id: String(req.params.orgId) },
    data: { plan: parsed.data.plan, ...(parsed.data.plan === "trial" ? { trialEndsAt: null } : {}) },
  });
  res.json({ ok: true, orgId: org.id, plan: org.plan });
});
