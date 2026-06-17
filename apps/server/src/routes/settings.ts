import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { planForOrg } from "./billing";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// ── Configurações da organização (WhatsApp etc.) ─────────────────────────────

settingsRouter.get("/settings", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const s = await prisma.orgSetting.findUnique({ where: { orgId } });
  res.json({
    whatsappPhoneNumberId: s?.whatsappPhoneNumberId ?? "",
    instagramPageId: s?.instagramPageId ?? "",
    // nunca devolve os tokens completos — só indica se estão configurados
    hasWhatsappToken: !!s?.whatsappAccessToken,
    hasInstagramToken: !!s?.instagramAccessToken,
    aiAutoReply: s?.aiAutoReply ?? false,
    brandName: s?.brandName ?? "",
    brandColor: s?.brandColor ?? "",
    brandLogoUrl: s?.brandLogoUrl ?? "",
  });
});

const SettingsBody = z.object({
  whatsappAccessToken: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  instagramAccessToken: z.string().optional(),
  instagramPageId: z.string().optional(),
  aiAutoReply: z.boolean().optional(),
  brandName: z.string().max(40).optional(),
  brandColor: z.string().max(20).optional(),
  brandLogoUrl: z.string().max(500).optional(),
});

settingsRouter.put("/settings", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = SettingsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const data: any = {};
  if (parsed.data.whatsappAccessToken) data.whatsappAccessToken = parsed.data.whatsappAccessToken;
  if (parsed.data.whatsappPhoneNumberId !== undefined) data.whatsappPhoneNumberId = parsed.data.whatsappPhoneNumberId;
  if (parsed.data.instagramAccessToken) data.instagramAccessToken = parsed.data.instagramAccessToken;
  if (parsed.data.instagramPageId !== undefined) data.instagramPageId = parsed.data.instagramPageId;
  if (parsed.data.aiAutoReply !== undefined) data.aiAutoReply = parsed.data.aiAutoReply;
  if (parsed.data.brandName !== undefined) data.brandName = parsed.data.brandName;
  if (parsed.data.brandColor !== undefined) data.brandColor = parsed.data.brandColor;
  if (parsed.data.brandLogoUrl !== undefined) data.brandLogoUrl = parsed.data.brandLogoUrl;

  const s = await prisma.orgSetting.upsert({
    where: { orgId },
    update: data,
    create: { orgId, ...data },
  });

  // registra o phone_number_id como conta do canal (necessário p/ roteamento do webhook)
  if (s.whatsappPhoneNumberId) {
    await prisma.channelAccount.upsert({
      where: { orgId_channel_externalAccountId: { orgId, channel: "whatsapp", externalAccountId: s.whatsappPhoneNumberId } } as any,
      update: {},
      create: { orgId, channel: "whatsapp", externalAccountId: s.whatsappPhoneNumberId, displayName: "WhatsApp principal" },
    });
  }

  // mesma coisa para o Instagram (roteia o webhook pela page/ig id)
  if (s.instagramPageId) {
    await prisma.channelAccount.upsert({
      where: { orgId_channel_externalAccountId: { orgId, channel: "instagram", externalAccountId: s.instagramPageId } } as any,
      update: {},
      create: { orgId, channel: "instagram", externalAccountId: s.instagramPageId, displayName: "Instagram principal" },
    });
  }

  res.json({
    ok: true,
    whatsappPhoneNumberId: s.whatsappPhoneNumberId ?? "",
    instagramPageId: s.instagramPageId ?? "",
    hasWhatsappToken: !!s.whatsappAccessToken,
    hasInstagramToken: !!s.instagramAccessToken,
    aiAutoReply: s.aiAutoReply,
    brandName: s.brandName ?? "",
    brandColor: s.brandColor ?? "",
    brandLogoUrl: s.brandLogoUrl ?? "",
  });
});

// Marca da organização (qualquer membro pode ler — usado para aplicar white-label no app)
settingsRouter.get("/branding", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const s = await prisma.orgSetting.findUnique({ where: { orgId } });
  res.json({
    brandName: s?.brandName ?? "",
    brandColor: s?.brandColor ?? "",
    brandLogoUrl: s?.brandLogoUrl ?? "",
  });
});

// ── Equipe (gestão de acessos) ───────────────────────────────────────────────

settingsRouter.get("/team", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const members = await prisma.membership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(members.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    since: m.createdAt,
  })));
});

const MemberCreate = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
  role: z.enum(["partner", "admin", "agent", "viewer"]),
});

settingsRouter.post("/team", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = MemberCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });

  // trava por plano: limite de usuários
  const plan = await planForOrg(orgId);
  const userCount = await prisma.membership.count({ where: { orgId } });
  if (userCount >= plan.users) {
    return res.status(402).json({ error: "plan_limit_reached", resource: "users", limit: plan.users, note: `Você atingiu o limite de ${plan.users} usuário(s) do seu plano. Faça upgrade para adicionar mais.` });
  }

  const { name, email, password, role } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const existing = await prisma.membership.findUnique({ where: { orgId_userId: { orgId, userId: user.id } } });
    if (existing) return res.status(409).json({ error: "already_member" });
  } else {
    user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 10) } });
  }

  const membership = await prisma.membership.create({ data: { orgId, userId: user.id, role } });
  res.json({ ok: true, membershipId: membership.id, userId: user.id, name: user.name, email: user.email, role });
});

settingsRouter.delete("/team/:membershipId", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const m = await prisma.membership.findFirst({ where: { id: String(req.params.membershipId), orgId } });
  if (!m) return res.status(404).json({ error: "not_found" });
  if (m.role === "owner") return res.status(400).json({ error: "cannot_remove_owner" });
  if (m.userId === req.user!.userId) return res.status(400).json({ error: "cannot_remove_self" });

  await prisma.membership.delete({ where: { id: m.id } });
  res.json({ ok: true });
});

// ── Painel do gestor ─────────────────────────────────────────────────────────

settingsRouter.get("/analytics/manager", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;

  const [deals, members, tasksOpen, contacts] = await Promise.all([
    prisma.deal.findMany({
      where: { orgId },
      select: { id: true, value: true, status: true, lostReason: true, ownerId: true, createdAt: true, updatedAt: true },
    }),
    prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.task.count({ where: { orgId, status: "open" } }),
    prisma.contact.count({ where: { orgId } }),
  ]);

  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const open = deals.filter((d) => d.status === "open");

  // desempenho por membro
  const byMember = members.map((m) => {
    const mine = deals.filter((d) => d.ownerId === m.user.id);
    const mineWon = mine.filter((d) => d.status === "won");
    return {
      userId: m.user.id,
      name: m.user.name,
      role: m.role,
      deals: mine.length,
      won: mineWon.length,
      revenue: mineWon.reduce((s, d) => s + d.value, 0),
      openValue: mine.filter((d) => d.status === "open").reduce((s, d) => s + d.value, 0),
    };
  });

  // motivos de perda agregados
  const lossReasons: Record<string, number> = {};
  for (const d of lost) {
    const r = d.lostReason?.trim() || "Não informado";
    lossReasons[r] = (lossReasons[r] ?? 0) + 1;
  }

  res.json({
    totals: {
      contacts,
      tasksOpen,
      dealsOpen: open.length,
      dealsWon: won.length,
      dealsLost: lost.length,
      revenue: won.reduce((s, d) => s + d.value, 0),
      pipelineValue: open.reduce((s, d) => s + d.value, 0),
      winRate: won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
    },
    byMember,
    lossReasons: Object.entries(lossReasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  });
});
