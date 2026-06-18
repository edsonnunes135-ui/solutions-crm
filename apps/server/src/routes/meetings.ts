/**
 * Reuniões por vídeo da empresa. O agendamento fica aqui; a sala de vídeo em si
 * é uma sala do Jitsi Meet (grátis, sem conta), com nome determinístico por org,
 * embutida no frontend. Qualquer membro entra na sala; só o gestor agenda.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const meetingsRouter = Router();
meetingsRouter.use(requireAuth);

// Lista reuniões da empresa (próximas primeiro), escondendo as muito antigas.
meetingsRouter.get("/meetings", async (req: AuthedRequest, res) => {
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000); // some 6h depois do horário
  const meetings = await prisma.meeting.findMany({
    where: { orgId: req.user!.orgId, scheduledAt: { gte: cutoff } },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  res.json(meetings);
});

const MeetingBody = z.object({ title: z.string().min(1).max(120), scheduledAt: z.coerce.date() });

meetingsRouter.post("/meetings", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = MeetingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } });
  const meeting = await prisma.meeting.create({
    data: {
      orgId: req.user!.orgId,
      title: parsed.data.title,
      scheduledAt: parsed.data.scheduledAt,
      createdById: req.user!.userId,
      createdByName: user?.name ?? "Gestor",
    },
  });
  res.json(meeting);
});

meetingsRouter.delete("/meetings/:id", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const m = await prisma.meeting.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!m) return res.status(404).json({ error: "not_found" });
  await prisma.meeting.delete({ where: { id: m.id } });
  res.json({ ok: true });
});
