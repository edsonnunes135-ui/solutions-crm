/**
 * Construtor de fluxos no-code: o gestor monta visualmente os fluxos de
 * atendimento da IA (gatilhos + blocos). Guardado como JSON (triggers/steps).
 * A integração com o agente de IA ao vivo é feita à parte (no handler do agente).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const flowsRouter = Router();
flowsRouter.use(requireAuth);

const StepSchema = z.object({
  type: z.enum(["message", "ask", "action"]),
  text: z.string().max(2000).optional(),
  saveAs: z.string().max(60).optional(),
  action: z.enum(["tag", "task", "stage", "handoff"]).optional(),
  value: z.string().max(200).optional(),
});
const FlowBody = z.object({
  name: z.string().min(1).max(80),
  active: z.boolean().optional(),
  triggers: z.array(z.string().min(1).max(120)).max(50),
  steps: z.array(StepSchema).max(50),
});

// Lista os fluxos da empresa
flowsRouter.get("/flows", async (req: AuthedRequest, res) => {
  const flows = await prisma.flow.findMany({
    where: { orgId: req.user!.orgId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  res.json(flows);
});

flowsRouter.post("/flows", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = FlowBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const flow = await prisma.flow.create({
    data: {
      orgId: req.user!.orgId,
      name: parsed.data.name,
      active: parsed.data.active ?? true,
      triggers: parsed.data.triggers as any,
      steps: parsed.data.steps as any,
    },
  });
  res.json(flow);
});

flowsRouter.put("/flows/:id", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const parsed = FlowBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const existing = await prisma.flow.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const flow = await prisma.flow.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      active: parsed.data.active ?? existing.active,
      triggers: parsed.data.triggers as any,
      steps: parsed.data.steps as any,
    },
  });
  res.json(flow);
});

flowsRouter.delete("/flows/:id", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const existing = await prisma.flow.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.flow.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
