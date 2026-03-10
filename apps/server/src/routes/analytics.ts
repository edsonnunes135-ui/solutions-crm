import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

// KPIs básicos — você vai evoluir isso para dashboards completos.
analyticsRouter.get("/analytics/kpis", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;

  const leads = await prisma.contact.count({ where: { orgId } });
  const openDeals = await prisma.deal.count({ where: { orgId, status: "open" } });
  const pipelineValue = await prisma.deal.aggregate({
    where: { orgId, status: "open" },
    _sum: { value: true },
  });
  const tasksOpen = await prisma.task.count({ where: { orgId, status: "open" } });

  res.json({
    leads,
    openDeals,
    pipelineValue: pipelineValue._sum.value ?? 0,
    tasksOpen,
  });
});
