import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { crudRouter } from "./routes/crud";
import { analyticsRouter } from "./routes/analytics";
import { webhooksRouter } from "./routes/webhooks";
import { channelsRouter } from "./routes/channels";
import { aiRouter } from "./routes/ai";
import { devRouter } from "./routes/dev";
import { settingsRouter } from "./routes/settings";
import { billingRouter } from "./routes/billing";
import { broadcastRouter } from "./routes/broadcast";
import { mpWebhookRouter } from "./routes/mpwebhook";
import { pushRouter } from "./routes/push";
import { orgsRouter } from "./routes/orgs";
import { adminRouter } from "./routes/admin";
import { presenceRouter } from "./routes/presence";
import { chatRouter } from "./routes/chat";
import { meetingsRouter } from "./routes/meetings";
import { publicRouter } from "./routes/publicBranding";
import { widgetRouter } from "./routes/widget";
import { resellerRouter } from "./routes/reseller";
import { resellerPayRouter } from "./routes/resellerPay";
import { flowsRouter } from "./routes/flows";
import { publicApiRouter } from "./routes/publicApi";
import { apiKeysRouter } from "./routes/apiKeys";

dotenv.config();

// Segurança: nunca rodar com o segredo de JWT padrão em produção.
if (!process.env.JWT_SECRET) {
  const msg = "JWT_SECRET não definido — defina no ambiente (segredo forte e único).";
  if (process.env.NODE_ENV === "production") throw new Error(msg);
  console.warn("[aviso] " + msg + " Usando valor inseguro só em desenvolvimento.");
}

const app = express();
app.set("trust proxy", 1); // atrás do proxy do Render
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Proteção contra força bruta no login/registro
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_attempts" },
});
app.use("/auth", authLimiter);

// Limite geral da API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(healthRouter);
app.use(publicRouter);
app.use(widgetRouter);
app.use(authRouter);
// Webhooks públicos (sem JWT) — devem vir ANTES dos routers que aplicam requireAuth
app.use(webhooksRouter);
app.use(mpWebhookRouter);
// API pública autenticada por CHAVE (/api/v1) — precisa vir ANTES dos routers com requireAuth (JWT), senão o JWT intercepta
app.use("/api/v1", publicApiRouter);
app.use(crudRouter);
app.use(analyticsRouter);
app.use(channelsRouter);
app.use(aiRouter);
app.use(devRouter);
app.use(settingsRouter);
app.use(billingRouter);
app.use(broadcastRouter);
app.use(pushRouter);
app.use(orgsRouter);
app.use(resellerRouter);
app.use(resellerPayRouter);
app.use(flowsRouter);
app.use(apiKeysRouter);
app.use(adminRouter);
app.use(presenceRouter);
app.use(chatRouter);
app.use(meetingsRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Solutions API running on http://localhost:${port}`);
});

// Motor de automações embutido (mesmo processo da API — funciona no plano free)
import("./worker")
  .then((m) => m.startWorker())
  .catch((err) => console.error("worker_failed_to_start", err?.message ?? err));
