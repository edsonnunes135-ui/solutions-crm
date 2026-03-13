import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./lib/prisma";
import { enqueueEvent } from "./lib/queue";

/**
 * Cron runner (MVP)
 * - Gera Events para triggers "stale_stage" e "inactivity" com base nas automações ativas.
 *
 * Uso:
 *   npm run cron
 *
 * Em produção:
 * - rodar 1x por hora (stale_stage) e 1x/dia (inactivity)
 * - ou agendar via cron do servidor / Cloud Scheduler
 */

function hoursAgo(h: number) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function createStaleStageEvents() {
  const automations = await prisma.automation.findMany({
    where: { enabled: true, triggerType: "stale_stage" },
    select: { id: true, orgId: true, triggerConfig: true },
  });

  let created = 0;

  for (const a of automations) {
    const cfg: any = a.triggerConfig || {};
    const stageName = String(cfg.stageName || "").trim();
    const hours = Number(cfg.hours || 0);
    if (!stageName || !hours) continue;

    const cutoff = hoursAgo(hours);

    // Achamos estágio por nome em QUALQUER pipeline da org (mais simples pro MVP)
    const stage = await prisma.stage.findFirst({
      where: { orgId: a.orgId, name: { equals: stageName, mode: "insensitive" } },
      select: { id: true, pipelineId: true, name: true },
    });
    if (!stage) continue;

    // Deals parados = updatedAt menor que cutoff e ainda na etapa
    const deals = await prisma.deal.findMany({
      where: {
        orgId: a.orgId,
        stageId: stage.id,
        status: "open",
        updatedAt: { lt: cutoff },
      },
      select: { id: true, contactId: true, stageId: true, pipelineId: true, updatedAt: true },
      take: 500,
    });

    for (const d of deals) {
      // De-dup simples: evita criar 2 events iguais no mesmo dia p/ mesmo deal+stage
      const exists = await prisma.event.findFirst({
        where: {
          orgId: a.orgId,
          type: "stale_stage",
          createdAt: { gt: daysAgo(1) },
          payload: {
            path: ["dealId"],
            equals: d.id,
          },
        } as any,
      });
      if (exists) continue;

      const ev = await prisma.event.create({
        data: {
          orgId: a.orgId,
          type: "stale_stage",
          payload: {
            dealId: d.id,
            contactId: d.contactId,
            stageId: d.stageId,
            pipelineId: d.pipelineId,
            stageName,
            hours,
            lastUpdateAt: d.updatedAt,
          },
        },
      });
      await enqueueEvent(ev.id);
      created++;
    }
  }

  return created;
}

async function createInactivityEvents() {
  const automations = await prisma.automation.findMany({
    where: { enabled: true, triggerType: "inactivity" },
    select: { id: true, orgId: true, triggerConfig: true },
  });

  let created = 0;

  for (const a of automations) {
    const cfg: any = a.triggerConfig || {};
    const days = Number(cfg.days || 0);
    if (!days) continue;

    const cutoff = daysAgo(days);

    const conversations = await prisma.conversation.findMany({
      where: {
        orgId: a.orgId,
        status: "open",
        lastAt: { lt: cutoff },
      },
      select: { id: true, contactId: true, channel: true, lastAt: true },
      take: 800,
    });

    for (const c of conversations) {
      // De-dup simples: 1 event por conversa por dia
      const exists = await prisma.event.findFirst({
        where: {
          orgId: a.orgId,
          type: "inactivity",
          createdAt: { gt: daysAgo(1) },
          payload: { path: ["conversationId"], equals: c.id },
        } as any,
      });
      if (exists) continue;

      const ev = await prisma.event.create({
        data: {
          orgId: a.orgId,
          type: "inactivity",
          payload: {
            conversationId: c.id,
            contactId: c.contactId,
            channel: c.channel,
            days,
            lastAt: c.lastAt,
          },
        },
      });
      await enqueueEvent(ev.id);
      created++;
    }
  }

  return created;
}

async function main() {
  const stale = await createStaleStageEvents();
  const inactive = await createInactivityEvents();

  console.log(JSON.stringify({ ok: true, stale_stage_events: stale, inactivity_events: inactive }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
