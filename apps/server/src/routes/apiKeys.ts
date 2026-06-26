/**
 * Gerenciamento (via login, só gestor) das chaves de API e dos webhooks de saída.
 * A chave em texto é mostrada UMA única vez (na criação); depois guardamos só o hash.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { generateApiKey } from "../lib/apiAuth";

export const apiKeysRouter = Router();
apiKeysRouter.use(requireAuth);

const manager = requireRole("owner", "partner", "admin");

apiKeysRouter.get("/api-keys", manager, async (req: AuthedRequest, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { orgId: req.user!.orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });
  res.json(keys);
});

apiKeysRouter.post("/api-keys", manager, async (req: AuthedRequest, res) => {
  const parsed = z.object({ name: z.string().min(1).max(60) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { raw, hash, prefix } = generateApiKey();
  const key = await prisma.apiKey.create({ data: { orgId: req.user!.orgId, name: parsed.data.name, keyHash: hash, prefix } });
  res.json({ id: key.id, name: key.name, key: raw }); // chave em texto SÓ agora
});

apiKeysRouter.delete("/api-keys/:id", manager, async (req: AuthedRequest, res) => {
  const existing = await prisma.apiKey.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.apiKey.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

apiKeysRouter.get("/webhooks", manager, async (req: AuthedRequest, res) => {
  const hooks = await prisma.webhook.findMany({ where: { orgId: req.user!.orgId }, orderBy: { createdAt: "desc" } });
  res.json(hooks);
});

apiKeysRouter.post("/webhooks", manager, async (req: AuthedRequest, res) => {
  const parsed = z.object({ url: z.string().url(), event: z.enum(["all", "message.received", "contact.created"]).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const hook = await prisma.webhook.create({ data: { orgId: req.user!.orgId, url: parsed.data.url, event: parsed.data.event ?? "all" } });
  res.json(hook);
});

apiKeysRouter.delete("/webhooks/:id", manager, async (req: AuthedRequest, res) => {
  const existing = await prisma.webhook.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.webhook.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
