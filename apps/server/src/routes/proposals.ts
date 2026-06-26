/**
 * Propostas / orçamentos (gestão, via login). O cliente vê e aceita pelo link
 * público (ver publicBranding.ts: /public/proposal/:publicId).
 */
import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const proposalsRouter = Router();
proposalsRouter.use(requireAuth);
const manager = requireRole("owner", "partner", "admin");

proposalsRouter.get("/proposals", async (req: AuthedRequest, res) => {
  const items = await prisma.proposal.findMany({ where: { orgId: req.user!.orgId }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(items);
});

const ItemSchema = z.object({
  description: z.string().min(1).max(200),
  qty: z.number().positive().max(100000),
  unitPrice: z.number().nonnegative().max(10000000),
});
const Body = z.object({
  title: z.string().min(1).max(160),
  contactName: z.string().max(120).optional(),
  items: z.array(ItemSchema).min(1).max(50),
});
proposalsRouter.post("/proposals", manager, async (req: AuthedRequest, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const total = parsed.data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const publicId = crypto.randomBytes(9).toString("hex");
  const p = await prisma.proposal.create({
    data: { orgId: req.user!.orgId, publicId, title: parsed.data.title, contactName: parsed.data.contactName || null, items: parsed.data.items as any, total, status: "draft" },
  });
  res.json(p);
});

proposalsRouter.patch("/proposals/:id", manager, async (req: AuthedRequest, res) => {
  const parsed = z.object({ status: z.enum(["draft", "sent", "accepted", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const existing = await prisma.proposal.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const p = await prisma.proposal.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
  res.json(p);
});

proposalsRouter.delete("/proposals/:id", manager, async (req: AuthedRequest, res) => {
  const existing = await prisma.proposal.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.proposal.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
