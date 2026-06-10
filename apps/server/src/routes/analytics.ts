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

// Série temporal: leads criados e negócios ganhos por dia (últimos 7 dias)
analyticsRouter.get("/analytics/series", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const days = 7;
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [contacts, wonDeals] = await Promise.all([
    prisma.contact.findMany({ where: { orgId, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.deal.findMany({ where: { orgId, status: "won", updatedAt: { gte: since } }, select: { updatedAt: true } }),
  ]);

  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const series: { day: string; leads: number; wins: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    series.push({
      day: labels[d.getDay()],
      leads: contacts.filter((c) => c.createdAt >= d && c.createdAt < next).length,
      wins: wonDeals.filter((w) => w.updatedAt >= d && w.updatedAt < next).length,
    });
  }
  res.json(series);
});
