/**
 * Canais de comunicação ao vivo (mensagem de texto), por empresa:
 *  - /chat/team    : gestor + vendedores da empresa conversam (todos os membros).
 *  - /chat/support : o gestor da empresa fala com o CEO da plataforma.
 * O lado do CEO (caixa de entrada de suporte de todas as empresas) fica em admin.ts.
 * Tempo real via polling no frontend (busca a cada poucos segundos).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const chatRouter = Router();
chatRouter.use(requireAuth);

const Body = z.object({ body: z.string().min(1).max(2000) });

async function userName(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name ?? "Usuário";
}

// ── Chat da equipe (gestor + vendedores) ─────────────────────────────────────
chatRouter.get("/chat/team", async (req: AuthedRequest, res) => {
  const msgs = await prisma.chatMessage.findMany({
    where: { scope: "team", orgId: req.user!.orgId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  res.json(msgs);
});

chatRouter.post("/chat/team", async (req: AuthedRequest, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const msg = await prisma.chatMessage.create({
    data: {
      scope: "team",
      orgId: req.user!.orgId,
      fromUserId: req.user!.userId,
      fromName: await userName(req.user!.userId),
      fromRole: req.user!.role,
      body: parsed.data.body,
    },
  });
  res.json(msg);
});

// ── Suporte com o CEO (só o gestor abre/posta) ───────────────────────────────
chatRouter.get("/chat/support", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const msgs = await prisma.chatMessage.findMany({
    where: { scope: "support", orgId: req.user!.orgId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  res.json(msgs);
});

chatRouter.post("/chat/support", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const msg = await prisma.chatMessage.create({
    data: {
      scope: "support",
      orgId: req.user!.orgId,
      fromUserId: req.user!.userId,
      fromName: await userName(req.user!.userId),
      fromRole: req.user!.role,
      body: parsed.data.body,
    },
  });
  res.json(msg);
});
