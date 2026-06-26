/**
 * API pública (v1) — autenticada por API KEY (não por login). Montada em /api/v1.
 * TUDO escopado por req.apiOrgId (isolamento total entre empresas).
 * Uso típico: Make/N8N/Zapier criam leads e leem contatos.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireApiKey, ApiRequest } from "../lib/apiAuth";
import { fireWebhooks } from "../lib/fireWebhooks";

export const publicApiRouter = Router();
publicApiRouter.use(requireApiKey);

// Testa a chave / identifica a empresa
publicApiRouter.get("/me", async (req: ApiRequest, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.apiOrgId! }, select: { id: true, name: true } });
  res.json({ org });
});

// Lista contatos da empresa
publicApiRouter.get("/contacts", async (req: ApiRequest, res) => {
  const take = Math.min(Number(req.query.limit) || 50, 200);
  const contacts = await prisma.contact.findMany({
    where: { orgId: req.apiOrgId! },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, name: true, phone: true, email: true, company: true, createdAt: true },
  });
  res.json({ contacts });
});

// Cria um contato/lead (o uso mais comum em automações)
const ContactBody = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  company: z.string().max(120).optional(),
});
publicApiRouter.post("/contacts", async (req: ApiRequest, res) => {
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const orgId = req.apiOrgId!;
  const contact = await prisma.contact.create({
    data: { orgId, name: parsed.data.name, phone: parsed.data.phone ?? null, email: parsed.data.email ?? null, company: parsed.data.company ?? null },
    select: { id: true, name: true, phone: true, email: true, company: true, createdAt: true },
  });
  fireWebhooks(orgId, "contact.created", contact).catch(() => {});
  res.json({ contact });
});
