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

dotenv.config();

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
app.use(authRouter);
app.use(crudRouter);
app.use(analyticsRouter);
app.use(webhooksRouter);
app.use(channelsRouter);
app.use(aiRouter);
app.use(devRouter);
app.use(settingsRouter);
app.use(billingRouter);
app.use(broadcastRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Solutions API running on http://localhost:${port}`);
});

// Motor de automações embutido (mesmo processo da API — funciona no plano free)
import("./worker")
  .then((m) => m.startWorker())
  .catch((err) => console.error("worker_failed_to_start", err?.message ?? err));
