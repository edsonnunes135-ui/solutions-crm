/**
 * Presença: o app manda um "batimento" (ping) a cada ~60s enquanto está aberto.
 * Com isso sabemos quem está online (visto há pouco), o último acesso e o tempo
 * total de uso acumulado. Usado pelo painel do CEO e pela aba Vendedores do gestor.
 */
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const presenceRouter = Router();
presenceRouter.use(requireAuth);

export const ONLINE_WINDOW_MS = 3 * 60 * 1000; // online = batimento nos últimos 3 min

// Heartbeat — atualiza o último acesso e acumula o tempo de uso contínuo.
presenceRouter.post("/presence/ping", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { lastSeenAt: true, usageMinutes: true },
  });
  const now = new Date();
  let usageMinutes = user?.usageMinutes ?? 0;
  if (user?.lastSeenAt) {
    const gapMs = now.getTime() - user.lastSeenAt.getTime();
    // só conta como uso contínuo se o ping anterior foi recente (sessão ativa)
    if (gapMs >= 30000 && gapMs <= 2.5 * 60 * 1000) {
      usageMinutes += Math.max(1, Math.round(gapMs / 60000));
    }
  }
  await prisma.user.update({ where: { id: req.user!.userId }, data: { lastSeenAt: now, usageMinutes } });
  res.json({ ok: true });
});

// Presença da equipe da empresa (gestor vê os vendedores dele online/offline)
presenceRouter.get("/presence/team", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const members = await prisma.membership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true, lastSeenAt: true, usageMinutes: true } } },
    orderBy: { createdAt: "asc" },
  });
  const now = Date.now();
  res.json(
    members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      online: m.user.lastSeenAt ? now - new Date(m.user.lastSeenAt).getTime() < ONLINE_WINDOW_MS : false,
      lastSeenAt: m.user.lastSeenAt,
      usageMinutes: m.user.usageMinutes,
    }))
  );
});
