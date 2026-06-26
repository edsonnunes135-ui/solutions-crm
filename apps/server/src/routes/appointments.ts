/**
 * Agenda — compromissos/eventos agendados (reuniões, ligações, follow-ups).
 * Escopo por empresa (todos da empresa veem a agenda da empresa).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

appointmentsRouter.get("/appointments", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 86400000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 60 * 86400000);
  const items = await prisma.appointment.findMany({
    where: { orgId, startAt: { gte: from, lte: to } },
    orderBy: { startAt: "asc" },
    take: 500,
  });
  const contactIds = [...new Set(items.map((i) => i.contactId).filter(Boolean) as string[])];
  const userIds = [...new Set(items.map((i) => i.assigneeId).filter(Boolean) as string[])];
  const [contacts, users] = await Promise.all([
    contactIds.length ? prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, name: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
  ]);
  const cName = Object.fromEntries(contacts.map((c) => [c.id, c.name]));
  const uName = Object.fromEntries(users.map((u) => [u.id, u.name]));
  res.json(items.map((i) => ({ ...i, contactName: i.contactId ? cName[i.contactId] ?? null : null, assigneeName: i.assigneeId ? uName[i.assigneeId] ?? null : null })));
});

const Body = z.object({
  title: z.string().min(1).max(160),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  contactId: z.string().optional(),
  assigneeId: z.string().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
appointmentsRouter.post("/appointments", async (req: AuthedRequest, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const d = parsed.data;
  const startAt = new Date(d.startAt);
  if (isNaN(startAt.getTime())) return res.status(400).json({ error: "invalid_date" });
  const appt = await prisma.appointment.create({
    data: {
      orgId: req.user!.orgId,
      title: d.title,
      startAt,
      endAt: d.endAt ? new Date(d.endAt) : null,
      contactId: d.contactId || null,
      assigneeId: d.assigneeId || req.user!.userId,
      location: d.location || null,
      notes: d.notes || null,
    },
  });
  res.json(appt);
});

const PatchBody = z.object({
  status: z.enum(["scheduled", "done", "canceled"]).optional(),
  title: z.string().min(1).max(160).optional(),
  startAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
appointmentsRouter.patch("/appointments/:id", async (req: AuthedRequest, res) => {
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const existing = await prisma.appointment.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const data: any = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.title) data.title = parsed.data.title;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.startAt) { const s = new Date(parsed.data.startAt); if (!isNaN(s.getTime())) data.startAt = s; }
  const appt = await prisma.appointment.update({ where: { id: existing.id }, data });
  res.json(appt);
});

appointmentsRouter.delete("/appointments/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.appointment.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.appointment.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
