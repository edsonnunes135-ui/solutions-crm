/**
 * White-label Fase 2 — planos do parceiro (revenda). O parceiro cria os próprios
 * planos (nome, preço, limites) e atribui a cada cliente dele. Os limites do
 * cliente passam a valer pelo plano do parceiro (override em planForOrg).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const resellerRouter = Router();
resellerRouter.use(requireAuth);

const PlanBody = z.object({
  name: z.string().min(1).max(60),
  price: z.number().int().nonnegative(),
  users: z.number().int().min(1).max(9999),
  contacts: z.number().int().min(1).max(1000000),
  automations: z.number().int().min(0).max(9999),
  broadcast: z.boolean(),
  ai: z.boolean(),
});

// Planos que ESTE parceiro criou
resellerRouter.get("/reseller/plans", async (req: AuthedRequest, res) => {
  const plans = await prisma.resellerPlan.findMany({
    where: { resellerOrgId: req.user!.orgId, active: true },
    orderBy: [{ order: "asc" }, { price: "asc" }],
  });
  res.json(plans);
});

resellerRouter.post("/reseller/plans", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const plan = await prisma.resellerPlan.create({ data: { resellerOrgId: req.user!.orgId, ...parsed.data } });
  res.json(plan);
});

resellerRouter.put("/reseller/plans/:id", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const existing = await prisma.resellerPlan.findFirst({ where: { id: String(req.params.id), resellerOrgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const plan = await prisma.resellerPlan.update({ where: { id: existing.id }, data: parsed.data });
  res.json(plan);
});

resellerRouter.delete("/reseller/plans/:id", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const existing = await prisma.resellerPlan.findFirst({ where: { id: String(req.params.id), resellerOrgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.resellerPlan.update({ where: { id: existing.id }, data: { active: false } });
  res.json({ ok: true });
});

// Atribui um plano do parceiro a um cliente dele (planId null = volta pro trial)
const AssignBody = z.object({ planId: z.string().nullable() });
resellerRouter.post("/reseller/clients/:orgId/plan", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = AssignBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const client = await prisma.organization.findFirst({ where: { id: String(req.params.orgId), resellerOrgId: req.user!.orgId } });
  if (!client) return res.status(404).json({ error: "client_not_found" });

  if (!parsed.data.planId) {
    await prisma.organization.update({
      where: { id: client.id },
      data: { plan: "trial", planLabel: null, planPrice: null, maxUsers: null, maxContacts: null, maxAutomations: null, featBroadcast: null, featAi: null },
    });
    return res.json({ ok: true, plan: "trial" });
  }

  const plan = await prisma.resellerPlan.findFirst({ where: { id: parsed.data.planId, resellerOrgId: req.user!.orgId } });
  if (!plan) return res.status(404).json({ error: "plan_not_found" });
  await prisma.organization.update({
    where: { id: client.id },
    data: {
      plan: "custom",
      planLabel: plan.name,
      planPrice: plan.price,
      maxUsers: plan.users,
      maxContacts: plan.contacts,
      maxAutomations: plan.automations,
      featBroadcast: plan.broadcast,
      featAi: plan.ai,
    },
  });
  res.json({ ok: true, plan: plan.name });
});
