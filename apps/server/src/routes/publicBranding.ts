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
