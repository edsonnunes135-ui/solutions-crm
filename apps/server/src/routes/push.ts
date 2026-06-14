import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { pushEnabled, vapidPublicKey } from "../lib/push";

export const pushRouter = Router();
pushRouter.use(requireAuth);

pushRouter.get("/push/vapid-key", (_req, res) => {
  res.json({ enabled: pushEnabled(), publicKey: vapidPublicKey() });
});

const SubBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

pushRouter.post("/push/subscribe", async (req: AuthedRequest, res) => {
  const parsed = SubBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, orgId: req.user!.orgId, userId: req.user!.userId },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, orgId: req.user!.orgId, userId: req.user!.userId },
  });
  res.json({ ok: true });
});
