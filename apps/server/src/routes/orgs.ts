import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

/**
 * Multi-empresa / revenda: um mesmo usuário pode ter acesso (membership) a
 * várias organizações, criar novas (modelo agência) e alternar entre elas.
 */
export const orgsRouter = Router();
orgsRouter.use(requireAuth);

function sign(userId: string, orgId: string, role: string) {
  const secret = process.env.JWT_SECRET || "change_me";
  return jwt.sign({ userId, orgId, role }, secret, { expiresIn: "7d" });
}

// Lista as empresas que o usuário acessa
orgsRouter.get("/orgs", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user!.userId },
    include: { org: { select: { id: true, name: true, plan: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(
    memberships.map((m) => ({
      orgId: m.org.id,
      name: m.org.name,
      plan: m.org.plan,
      role: m.role,
      current: m.org.id === req.user!.orgId,
    }))
  );
});

// White-label: empresas-clientes que entraram pelo link de revenda deste parceiro
orgsRouter.get("/reseller/clients", async (req: AuthedRequest, res) => {
  const clients = await prisma.organization.findMany({
    where: { resellerOrgId: req.user!.orgId },
    select: { id: true, name: true, plan: true, planLabel: true, createdAt: true, _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    clients.map((c) => ({ orgId: c.id, name: c.name, plan: c.plan, planLabel: c.planLabel, users: c._count.users, createdAt: c.createdAt }))
  );
});

// Cria uma nova empresa (cliente) — o usuário vira owner dela
const CreateOrg = z.object({ name: z.string().min(2) });
orgsRouter.post("/orgs", async (req: AuthedRequest, res) => {
  const parsed = CreateOrg.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const org = await prisma.organization.create({ data: { name: parsed.data.name, trialEndsAt } });
  await prisma.membership.create({ data: { orgId: org.id, userId: req.user!.userId, role: "owner" } });

  res.json({ ok: true, orgId: org.id, name: org.name });
});

// Troca a empresa ativa (reemite o token apontando para outra org do usuário)
const SwitchBody = z.object({ orgId: z.string().min(1) });
orgsRouter.post("/orgs/switch", async (req: AuthedRequest, res) => {
  const parsed = SwitchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const m = await prisma.membership.findFirst({
    where: { userId: req.user!.userId, orgId: parsed.data.orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!m) return res.status(403).json({ error: "not_a_member" });

  const token = sign(m.userId, m.orgId, m.role);
  res.json({ token, orgId: m.orgId, role: m.role, user: m.user });
});
