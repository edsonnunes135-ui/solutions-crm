/**
 * Portal do cliente (magic-link). O gestor gera um link único por contato; o
 * cliente abre sem login e vê as propostas dele (ver publicBranding.ts: /public/portal/:token).
 * O token é um segredo não-adivinhável (igual ao link público da proposta).
 */
import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const portalRouter = Router();
portalRouter.use(requireAuth);
const manager = requireRole("owner", "partner", "admin");

// Garante (ou cria) o token do portal de um contato e devolve.
portalRouter.post("/contacts/:id/portal-link", manager, async (req: AuthedRequest, res) => {
  const c = await prisma.contact.findFirst({ where: { id: String(req.params.id), orgId: req.user!.orgId } });
  if (!c) return res.status(404).json({ error: "not_found" });
  let token = c.portalToken;
  if (!token) {
    token = crypto.randomBytes(12).toString("hex");
    await prisma.contact.update({ where: { id: c.id }, data: { portalToken: token } });
  }
  res.json({ token });
});
