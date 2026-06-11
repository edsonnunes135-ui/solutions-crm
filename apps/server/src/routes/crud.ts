import { ensureAuth } from "../middlewares/ensureAuth";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { enqueueEvent } from "../lib/queue";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const crudRouter = Router();
crudRouter.use(requireAuth);

// Contacts
crudRouter.get("/contacts", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const items = await prisma.contact.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    include: { tags: { include: { tag: true } } },
    take: 200,
  });
  res.json(items.map(c => ({
    ...c,
    tags: c.tags.map(t => t.tag.name),
  })));
});

const ContactCreate = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

crudRouter.post("/contacts", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = ContactCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });

  const { tags = [], ...data } = parsed.data;

  const contact = await prisma.contact.create({ data: { orgId, ...data } });

  for (const tagName of tags) {
    const tag = await prisma.tag.upsert({
      where: { orgId_name: { orgId, name: tagName } },
      update: {},
      create: { orgId, name: tagName },
    });
    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
      update: {},
      create: { orgId, contactId: contact.id, tagId: tag.id },
    });
  }

  res.json(contact);
});

// Histórico de mensagens de um contato (todas as conversas dele)
crudRouter.get("/contacts/:id/messages", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const contact = await prisma.contact.findFirst({ where: { id: String(req.params.id), orgId } });
  if (!contact) return res.status(404).json({ error: "not_found" });

  const conversations = await prisma.conversation.findMany({
    where: { orgId, contactId: contact.id },
    select: { id: true, channel: true },
  });

  const messages = await prisma.message.findMany({
    where: { orgId, conversationId: { in: conversations.map((c) => c.id) } },
    orderBy: { sentAt: "asc" },
    take: 200,
  });

  res.json({
    conversationId: conversations[0]?.id ?? null,
    channel: conversations[0]?.channel ?? "whatsapp",
    messages,
  });
});

// Mover conversa para a pasta de apagados (soft delete) — só gestor/dono
crudRouter.delete("/contacts/:id/conversations", requireRole("owner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const contact = await prisma.contact.findFirst({ where: { id: String(req.params.id), orgId } });
  if (!contact) return res.status(404).json({ error: "not_found" });

  await prisma.contact.update({ where: { id: contact.id }, data: { conversationDeletedAt: new Date() } });
  await prisma.conversation.updateMany({ where: { orgId, contactId: contact.id }, data: { status: "deleted" } });
  res.json({ ok: true });
});

// Restaurar conversa da pasta de apagados — só gestor/dono
crudRouter.post("/contacts/:id/conversations/restore", requireRole("owner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const contact = await prisma.contact.findFirst({ where: { id: String(req.params.id), orgId } });
  if (!contact) return res.status(404).json({ error: "not_found" });

  await prisma.contact.update({ where: { id: contact.id }, data: { conversationDeletedAt: null } });
  await prisma.conversation.updateMany({ where: { orgId, contactId: contact.id }, data: { status: "open" } });
  res.json({ ok: true });
});

// Pipelines & stages
crudRouter.get("/pipelines", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const items = await prisma.pipeline.findMany({
    where: { orgId },
    include: { stages: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(items);
});

const PipelineCreate = z.object({
  name: z.string().min(2),
  kind: z.string().optional(),
  stages: z.array(z.object({ name: z.string().min(1) })).min(1),
});

crudRouter.post("/pipelines", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = PipelineCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const { name, kind = "sales", stages } = parsed.data;

  const pipeline = await prisma.pipeline.create({
    data: {
      orgId,
      name,
      kind,
      stages: {
        create: stages.map((s, idx) => ({ orgId, name: s.name, order: idx + 1 })),
      },
    },
    include: { stages: true },
  });

  res.json(pipeline);
});

// Deals
crudRouter.get("/deals", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const items = await prisma.deal.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    include: { stage: true, contact: true, pipeline: true },
    take: 300,
  });
  res.json(items);
});

const DealCreate = z.object({
  contactId: z.string().min(1),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string().min(1),
  value: z.number().int().nonnegative().optional(),
});

crudRouter.post("/deals", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = DealCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const deal = await prisma.deal.create({
    data: { orgId, ...parsed.data, value: parsed.data.value ?? 0, ownerId: req.user!.userId },
  });
  res.json(deal);
});

crudRouter.delete("/deals/:id", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const deleted = await prisma.deal.deleteMany({ where: { id: String(req.params.id), orgId } });
  if (deleted.count === 0) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

crudRouter.patch("/deals/:id", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const id = req.params.id;
  const Body = z.object({
    stageId: z.string().optional(),
    status: z.string().optional(),
    value: z.number().int().optional(),
    title: z.string().optional(),
    lostReason: z.string().optional(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  // Garante que o deal pertence à organização do usuário
  const existing = await prisma.deal.findFirst({ where: { id: String(id), orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });

  const deal = await prisma.deal.update({
    where: { id: String(id) },
    data: {
      stageId: parsed.data.stageId,
      status: parsed.data.status,
      value: parsed.data.value,
      title: parsed.data.title,
      lostReason: parsed.data.lostReason,
    },
  });

  if (parsed.data.stageId) {
    // Log event for automations
    await prisma.event.create({
      data: { orgId, type: "stage_changed", payload: { dealId: id, toStageId: parsed.data.stageId } },
    });
  }

  res.json(deal);
});

// Tasks
crudRouter.get("/tasks", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const items = await prisma.task.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(items);
});

const TaskCreate = z.object({
  title: z.string().min(1),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

crudRouter.post("/tasks", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = TaskCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const task = await prisma.task.create({
    data: {
      orgId,
      title: parsed.data.title,
      priority: parsed.data.priority ?? "medium",
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      contactId: typeof parsed.data.contactId === "string" ? parsed.data.contactId : null,
      dealId: typeof parsed.data.dealId === "string" ? parsed.data.dealId : null,
    },
  });
  res.json(task);
});

crudRouter.patch("/tasks/:id/complete", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const id = req.params.id;
  const updated = await prisma.task.updateMany({
    where: { id: String(id), orgId },
    data: { status: "done" },
  });
  if (updated.count === 0) return res.status(404).json({ error: "not_found" });
  const task = await prisma.task.findUnique({ where: { id: String(id) } });
  res.json(task);
});

// Automations (CRUD básico)
crudRouter.get("/automations", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const items = await prisma.automation.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(items);
});

const AutomationCreate = z.object({
  name: z.string().min(2),
  triggerType: z.string().min(2),
  triggerConfig: z.any(),
  conditions: z.any().optional(),
  actions: z.any(),
  enabled: z.boolean().optional(),
});

crudRouter.post("/automations", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = AutomationCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });

  const a = await prisma.automation.create({
    data: {
      orgId,
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      triggerConfig: parsed.data.triggerConfig,
      conditions: parsed.data.conditions ?? {},
      actions: parsed.data.actions,
      enabled: parsed.data.enabled ?? true,
    },
  });
  res.json(a);
});
