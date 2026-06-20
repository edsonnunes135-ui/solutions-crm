/**
 * Rotas públicas (sem login). Usadas no white-label: quando um cliente acessa o
 * link de um parceiro (?marca=<orgId>), a tela de login/cadastro busca a marca
 * do parceiro aqui pra se vestir com o logo, nome e cor dele.
 */
import { Router } from "express";
import { prisma } from "../lib/prisma";

export const publicRouter = Router();

publicRouter.get("/public/branding/:orgId", async (req, res) => {
  const s = await prisma.orgSetting.findUnique({ where: { orgId: String(req.params.orgId) } });
  res.json({
    brandName: s?.brandName ?? "",
    brandColor: s?.brandColor ?? "",
    brandLogoUrl: s?.brandLogoUrl ?? "",
  });
});

// Planos públicos de um parceiro (white-label) — o cliente vê na hora de assinar
publicRouter.get("/public/plans/:resellerOrgId", async (req, res) => {
  const plans = await prisma.resellerPlan.findMany({
    where: { resellerOrgId: String(req.params.resellerOrgId), active: true },
    orderBy: [{ order: "asc" }, { price: "asc" }],
    select: { id: true, name: true, price: true, users: true, contacts: true, broadcast: true, ai: true },
  });
  res.json(plans);
});
