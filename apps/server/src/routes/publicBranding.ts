/**
 * Rotas públicas (sem login). Usadas no white-label: quando um cliente acessa o
 * link de um parceiro (?marca=<orgId>), a tela de login/cadastro busca a marca
 * do parceiro aqui pra se vestir com o logo, nome e cor dele.
 */
import { Router } from "express";
import { prisma } from "../lib/prisma";

export const publicRouter = Router();

const MP_CLIENT_ID = process.env.MP_CLIENT_ID || "";
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";
const PUBLIC_API = process.env.PUBLIC_API_URL || "https://solutions-api.onrender.com";
const PUBLIC_WEB = process.env.PUBLIC_WEB_URL || "https://solutionscrm.com.br";

// Retorno do OAuth do Mercado Pago — o parceiro autoriza e o MP redireciona aqui.
// state = orgId do parceiro. Troca o code por token e salva na conta do parceiro.
publicRouter.get("/reseller/mp/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code || !state || !MP_CLIENT_ID || !MP_CLIENT_SECRET) return res.redirect(`${PUBLIC_WEB}/?mp=erro`);
  try {
    const r = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${PUBLIC_API}/reseller/mp/callback`,
      }),
    });
    const data: any = await r.json();
    if (!r.ok || !data.access_token) return res.redirect(`${PUBLIC_WEB}/?mp=erro`);
    await prisma.orgSetting.upsert({
      where: { orgId: state },
      update: { mpAccessToken: data.access_token, mpRefreshToken: data.refresh_token ?? null, mpUserId: String(data.user_id ?? ""), mpConnectedAt: new Date() },
      create: { orgId: state, mpAccessToken: data.access_token, mpRefreshToken: data.refresh_token ?? null, mpUserId: String(data.user_id ?? ""), mpConnectedAt: new Date() },
    });
    res.redirect(`${PUBLIC_WEB}/?mp=conectado`);
  } catch {
    res.redirect(`${PUBLIC_WEB}/?mp=erro`);
  }
});

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
