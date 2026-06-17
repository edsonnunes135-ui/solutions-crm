/**
 * Painel da PLATAFORMA (Solutions) — exclusivo do CEO.
 * Mostra o faturamento da Solutions como empresa de software (MRR vindo das
 * assinaturas), quantas empresas compraram e a distribuição de planos.
 * NUNCA expõe o faturamento interno das empresas-clientes (vendas delas) — só
 * o que cada uma paga de assinatura. Essa é a linha de privacidade do produto.
 */
import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { isPlatformAdminEmail, requirePlatformAdmin } from "../lib/platformAdmin";
import { PLANS } from "./billing";

export const adminRouter = Router();
adminRouter.use(requireAuth);

// Empresas escondidas do faturamento (contas de teste). Configurável por env.
function normalizeName(s?: string | null) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
const HIDDEN_ORG_NAMES = (process.env.METRICS_HIDDEN_ORGS || "dacolonia,velour")
  .split(",")
  .map((s) => normalizeName(s))
  .filter(Boolean);
function isHiddenOrg(...names: (string | null | undefined)[]) {
  return names.some((n) => HIDDEN_ORG_NAMES.includes(normalizeName(n)));
}

// Qualquer logado pode perguntar SE é CEO (a UI usa isso pra mostrar/ocultar a aba)
adminRouter.get("/admin/status", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true },
  });
  res.json({ isPlatformAdmin: isPlatformAdminEmail(user?.email) });
});

// Acessos — todas as pessoas que criaram conta na Solutions (só o CEO)
adminRouter.get("/admin/users", requirePlatformAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      memberships: { select: { role: true, org: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      companies: u.memberships.map((m) => ({ org: m.org.name, role: m.role })),
    }))
  );
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
      // dono da empresa — usado para detectar a(s) conta(s) interna(s) do CEO
      users: { where: { role: "owner" }, take: 1, select: { user: { select: { email: true } } } },
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
  let clientCompanies = 0;

  const companies = orgs
    .map((o) => {
      // Empresas escondidas (contas de teste) saem do faturamento por completo.
      if (isHiddenOrg(o.name, o.setting?.brandName)) return null;

      const plan = PLANS[o.plan] ?? PLANS.trial;
      const seats = Math.max(1, o._count.users);
      const monthly = o.plan === "trial" ? 0 : plan.price * seats;
      // Empresa "interna" = pertence ao próprio CEO. Não conta como receita/cliente.
      const internal = isPlatformAdminEmail(o.users[0]?.user?.email);

      if (!internal) {
        clientCompanies += 1;
        planCounts[o.plan] = (planCounts[o.plan] ?? 0) + 1;
        totalUsers += o._count.users;
        if (o.plan !== "trial") {
          mrr += monthly;
          activeSubscriptions += 1;
        }
        if (o.createdAt >= monthStart) newThisMonth += 1;
      }

      return {
        id: o.id,
        name: o.setting?.brandName || o.name,
        plan: o.plan,
        planName: plan.name,
        seats: o._count.users,
        monthly,
        internal,
        createdAt: o.createdAt,
        trialEndsAt: o.trialEndsAt,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  res.json({
    mrr,
    arr: mrr * 12,
    totalCompanies: clientCompanies, // só clientes (exclui a conta interna do CEO)
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

// CEO "entra" em qualquer empresa para dar suporte — sem precisar da senha do cliente.
// Emite um token apontando para a empresa-alvo (papel owner). É assim que o CEO
// mantém acesso total mesmo depois que o cliente troca a própria senha.
const ImpersonateBody = z.object({ orgId: z.string().min(1) });
adminRouter.post("/admin/impersonate", requirePlatformAdmin, async (req: AuthedRequest, res) => {
  const parsed = ImpersonateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const org = await prisma.organization.findUnique({
    where: { id: parsed.data.orgId },
    select: { id: true, name: true, setting: { select: { brandName: true } } },
  });
  if (!org) return res.status(404).json({ error: "org_not_found" });

  const secret = process.env.JWT_SECRET || "change_me";
  const token = jwt.sign({ userId: req.user!.userId, orgId: org.id, role: "owner" }, secret, { expiresIn: "1d" });
  res.json({ token, orgId: org.id, role: "owner", orgName: org.setting?.brandName || org.name });
});

// ── Aviso global da plataforma (CEO dispara, todos veem) ─────────────────────
// Qualquer usuário logado lê o aviso ativo mais recente (a UI mostra como banner).
adminRouter.get("/notices/active", async (_req, res) => {
  const notice = await prisma.platformNotice.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(notice ? { id: notice.id, message: notice.message, level: notice.level, createdAt: notice.createdAt } : null);
});

const NoticeBody = z.object({ message: z.string().min(2).max(280), level: z.enum(["info", "warning"]).optional() });
adminRouter.post("/admin/notices", requirePlatformAdmin, async (req, res) => {
  const parsed = NoticeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  // só um aviso ativo por vez: desativa os anteriores
  await prisma.platformNotice.updateMany({ where: { active: true }, data: { active: false } });
  const notice = await prisma.platformNotice.create({
    data: { message: parsed.data.message, level: parsed.data.level ?? "info" },
  });
  res.json({ ok: true, notice });
});

adminRouter.delete("/admin/notices", requirePlatformAdmin, async (_req, res) => {
  await prisma.platformNotice.updateMany({ where: { active: true }, data: { active: false } });
  res.json({ ok: true });
});
