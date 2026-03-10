import { ensureAuth } from "./middlewares/ensureAuth";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { crudRouter } from "./routes/crud";
import { analyticsRouter } from "./routes/analytics";
import { webhooksRouter } from "./routes/webhooks";
import { channelsRouter } from "./routes/channels";
import { aiRouter } from "./routes/ai";
import { devRouter } from "./routes/dev";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use(healthRouter);
app.use(authRouter);
app.use(ensureAuth);
app.use(crudRouter);
app.use(analyticsRouter);
app.use(webhooksRouter);
app.use(channelsRouter);
app.use(aiRouter);
app.use(devRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Solutions API running on http://localhost:${port}`);
});
