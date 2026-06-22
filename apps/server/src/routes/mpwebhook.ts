import { Router } from "express";
import { prisma } from "../lib/prisma";
import { PLANS } from "./billing";

/**
 * Webhook do Mercado Pago (público — quem chama é o Mercado Pago).
 * Recebe notificações de assinatura (preapproval), consulta o status real
 * na API e ativa/desativa o plano da organização conforme o pagamento.
 */
export const mpWebhookRouter = Router();

mpWebhookRouter.post("/webhooks/mercadopago", async (req, res) => {
  // responde rápido pra Meta/MP não reenviar; processa em seguida
  res.sendStatus(200);

  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return;

    const type = req.body?.type || req.query?.type || req.query?.topic;
    const id = req.body?.data?.id || req.query?.id || req.body?.id;
    if (!id) return;

    // só nos interessa eventos de assinatura
    if (type && !String(type).includes("preapproval") && !String(type).includes("subscription")) return;

    const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return;
    const sub: any = await r.json();

    const ref = String(sub.external_reference || "");

    // White-label atacado: taxa da plataforma que o PARCEIRO paga à Solutions.
    if (ref.startsWith("platformfee:")) {
      const resellerOrgId = ref.slice("platformfee:".length);
      if (resellerOrgId) {
        await prisma.orgSetting.updateMany({ where: { orgId: resellerOrgId }, data: { platformFeeStatus: sub.status } });
        await prisma.event.create({
          data: { orgId: resellerOrgId, type: "mp_platform_fee", processed: true, payload: { subscriptionId: String(id), status: sub.status } },
        }).catch(() => {});
      }
      return;
    }

    const [orgId, planKey] = ref.split(":");
    if (!orgId || !planKey || !PLANS[planKey]) return;

    // authorized = assinatura ativa; cancelled/paused = volta ao gratuito
    let newPlan: string | null = null;
    if (sub.status === "authorized") newPlan = planKey;
    else if (sub.status === "cancelled" || sub.status === "paused") newPlan = "trial";
    if (!newPlan) return;

    await prisma.organization.update({
      where: { id: orgId },
      data: { plan: newPlan, ...(newPlan !== "trial" ? { trialEndsAt: null } : {}) },
    });

    await prisma.event.create({
      data: {
        orgId,
        type: "mp_subscription",
        processed: true,
        payload: { subscriptionId: String(id), status: sub.status, plan: newPlan },
      },
    });
  } catch {
    // ignora — MP reenviará se necessário
  }
});
