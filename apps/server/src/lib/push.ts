import webpush from "web-push";
import { prisma } from "./prisma";

/**
 * Notificações push (Web Push / VAPID). Degrada graciosamente: se as chaves
 * VAPID não estiverem configuradas, as funções viram no-op.
 */
const PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@solutionscrm.com.br";

let configured = false;
if (PUBLIC && PRIVATE) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  } catch {
    configured = false;
  }
}

export function pushEnabled() {
  return configured;
}
export function vapidPublicKey() {
  return PUBLIC;
}

/** Envia uma notificação para todos os dispositivos inscritos de uma organização. */
export async function pushToOrg(orgId: string, payload: { title: string; body: string; url?: string }) {
  if (!configured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { orgId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // assinatura expirada/inválida → remove
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
}
