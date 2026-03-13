import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { prisma } from "./lib/prisma";
import { redisConnection } from "./lib/queue";

type JobData = { eventId: string };

type Action =
  | { type: "create_task"; title: string; priority?: "low" | "medium" | "high"; dueInHours?: number; dueInDays?: number; contactIdFrom?: "event"; dealIdFrom?: "event" }
  | { type: "move_to_pipeline"; pipelineKind: string; stageName: string; createDealIfMissing?: boolean }
  | { type: "send_message"; text?: string; template?: string; delayDays?: number; channel?: "whatsapp" | "instagram"; conversationIdFrom?: "event" }
  | { type: "add_tag"; tag: string; contactIdFrom?: "event"; dealIdFrom?: "event" }
  | { type: "create_deal"; pipelineKind: string; stageName: string; titleFrom?: "contact_company" | "contact_name"; value?: number }
  | { type: string; [k: string]: any };

function nowPlus({ hours = 0, days = 0 }: { hours?: number; days?: number }) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setDate(d.getDate() + days);
  return d;
}


async function upsertContactTag(orgId: string, contactId: string, tagName: string) {
  const tag = await prisma.tag.upsert({
    where: { orgId_name: { orgId, name: tagName } },
    update: {},
    create: { orgId, name: tagName },
  });

  await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId: tag.id } },
    update: {},
    create: { orgId, contactId, tagId: tag.id },
  });

  return tag.id;
}

async function resolvePipelineAndStage(orgId: string, pipelineKind: string, stageName: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { orgId, kind: pipelineKind },
    include: { stages: true },
    orderBy: { createdAt: "asc" },
  });
  if (!pipeline) throw new Error(`pipeline_not_found kind=${pipelineKind}`);

  const stage = pipeline.stages.find((s) => s.name.toLowerCase() === stageName.toLowerCase());
  if (!stage) throw new Error(`stage_not_found name=${stageName} kind=${pipelineKind}`);
  return { pipeline, stage };
}

function actionToText(action: any) {
  if (action.type === "send_message") return action.text || action.template || "send_message";
  if (action.type === "create_task") return action.title || "create_task";
  if (action.type === "move_to_pipeline") return `${action.pipelineKind}:${action.stageName}`;
  if (action.type === "add_tag") return `tag:${action.tag}`;
  if (action.type === "create_deal") return `create_deal:${action.pipelineKind}:${action.stageName}`;
  return action.type;
}

async function executeAction(orgId: string, event: any, action: Action) {
  switch (action.type) {
    case "create_task": {
      const contactId =
        action.contactIdFrom === "event" ? (event.payload as any)?.contactId ?? null : (event.payload as any)?.contactId ?? null;
      const dealId = action.dealIdFrom === "event" ? (event.payload as any)?.dealId ?? null : (event.payload as any)?.dealId ?? null;

      const dueAt =
        typeof action.dueInHours === "number"
          ? nowPlus({ hours: action.dueInHours })
          : typeof action.dueInDays === "number"
          ? nowPlus({ days: action.dueInDays })
          : null;

      const task = await prisma.task.create({
        data: {
          orgId,
          title: action.title,
          priority: action.priority ?? "medium",
          status: "open",
          dueAt,
          contactId,
          dealId,
        },
      });

      return { ok: true, created: { taskId: task.id } };
    }

    case "move_to_pipeline": {
      const dealId = (event.payload as any)?.dealId as string | undefined;
      const contactId = (event.payload as any)?.contactId as string | undefined;

      const { pipeline, stage } = await resolvePipelineAndStage(orgId, action.pipelineKind, action.stageName);

      if (dealId) {
        const updated = await prisma.deal.update({
          where: { id: dealId },
          data: { pipelineId: pipeline.id, stageId: stage.id },
        });
        return { ok: true, updated: { dealId: updated.id, pipelineId: pipeline.id, stageId: stage.id } };
      }

      if (contactId) {
        // tenta achar deal aberto; se não existir, cria se permitido
        const existing = await prisma.deal.findFirst({
          where: { orgId, contactId, status: "open" },
          orderBy: { updatedAt: "desc" },
        });

        if (existing) {
          const updated = await prisma.deal.update({
            where: { id: existing.id },
            data: { pipelineId: pipeline.id, stageId: stage.id },
          });
          return { ok: true, updated: { dealId: updated.id, pipelineId: pipeline.id, stageId: stage.id } };
        }

        if (action.createDealIfMissing ?? true) {
          const contact = await prisma.contact.findUnique({ where: { id: contactId } });
          const created = await prisma.deal.create({
            data: {
              orgId,
              contactId,
              pipelineId: pipeline.id,
              stageId: stage.id,
              title: `Negócio - ${contact?.company ?? contact?.name ?? "Lead"}`,
              value: 0,
            },
          });
          return { ok: true, created: { dealId: created.id } };
        }

        return { ok: false, skipped: "no_deal" };
      }

      return { ok: false, skipped: "no_deal_or_contact" };
    }

    case "send_message": {
      // MVP: grava mensagem outbound local. Integração real: enviar para canal oficial e salvar externalId/status.
      const conversationId = (event.payload as any)?.conversationId as string | undefined;
      const channel = (action.channel as any) ?? (event.payload as any)?.channel ?? "whatsapp";
      const text = action.text ?? (action.template ? `[template:${action.template}]` : "Mensagem");

      let convId = conversationId;
      if (!convId) {
        // tenta achar conversa pelo contato
        const contactId = (event.payload as any)?.contactId as string | undefined;
        if (contactId) {
          const conv = await prisma.conversation.findFirst({
            where: { orgId, contactId, channel },
            orderBy: { lastAt: "desc" },
          });
          if (conv) convId = conv.id;
          else {
            const created = await prisma.conversation.create({
              data: { orgId, contactId, channel, status: "open" },
            });
            convId = created.id;
          }
        }
      }

      if (!convId) return { ok: false, skipped: "no_conversation" };

      const msg = await prisma.message.create({
        data: {
          orgId,
          conversationId: convId,
          channel,
          direction: "outbound",
          text,
        },
      });

      await prisma.conversation.update({ where: { id: convId }, data: { lastAt: new Date() } });

      return { ok: true, created: { messageId: msg.id }, sent: false };
    }

case "add_tag": {
  const tagName = String(action.tag || "").trim();
  if (!tagName) return { ok: false, skipped: "empty_tag" };

  // resolve contactId from event payload
  let contactId: string | undefined = (event.payload as any)?.contactId;

  const dealId = (event.payload as any)?.dealId as string | undefined;
  if (!contactId && dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { contactId: true } });
    contactId = deal?.contactId;
  }

  if (!contactId) return { ok: false, skipped: "no_contact" };

  const tagId = await upsertContactTag(orgId, contactId, tagName);
  return { ok: true, upserted: { tagId, contactId } };
}

case "create_deal": {
  const contactId = (event.payload as any)?.contactId as string | undefined;
  if (!contactId) return { ok: false, skipped: "no_contact" };

  const { pipeline, stage } = await resolvePipelineAndStage(orgId, action.pipelineKind, action.stageName);

  // se já existe deal aberto para esse contato nesse pipeline, não duplica
  const existing = await prisma.deal.findFirst({
    where: { orgId, contactId, pipelineId: pipeline.id, status: "open" },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return { ok: true, skipped: "exists", dealId: existing.id };

  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true, company: true } });
  const title =
    action.titleFrom === "contact_name"
      ? `Negócio - ${contact?.name ?? "Lead"}`
      : `Negócio - ${contact?.company ?? contact?.name ?? "Lead"}`;

  const created = await prisma.deal.create({
    data: {
      orgId,
      contactId,
      pipelineId: pipeline.id,
      stageId: stage.id,
      title,
      value: Number(action.value || 0),
      status: "open",
    },
  });

  return { ok: true, created: { dealId: created.id, pipelineId: pipeline.id, stageId: stage.id } };
}


    default:
      return { ok: false, skipped: "unknown_action", type: action.type };
  }
}

function matchesTrigger(event: any, automation: any) {
  // triggerType já foi filtrado no query; aqui checamos configs simples (keywords, stageName, etc.)
  const tc = automation.triggerConfig || {};

  if (automation.triggerType === "stage_changed") {
    if (tc.toStageId) return (event.payload as any)?.toStageId === tc.toStageId;
    if (tc.toStageName) return true; // se quiser validar por nome, enrich payload no creator do event
    return true;
  }

  if (automation.triggerType === "message_received" && Array.isArray(tc.keywords)) {
    const text = String((event.payload as any)?.text ?? "").toLowerCase();
    return tc.keywords.some((k: string) => text.includes(String(k).toLowerCase()));
  }

  if (automation.triggerType === "stale_stage") {
    if (tc.stageName) return String((event.payload as any)?.stageName ?? "").toLowerCase() === String(tc.stageName).toLowerCase();
    return true;
  }

  if (automation.triggerType === "inactivity") {
    if (tc.days) return Number((event.payload as any)?.days ?? 0) >= Number(tc.days);
    return true;
  }

  return true;
}


async function evaluateConditions(orgId: string, event: any, conditions: any) {
  if (!conditions) return true;

  // conversationStatus
  if (conditions.conversationStatus) {
    const conversationId = (event.payload as any)?.conversationId;
    if (!conversationId) return false;
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.status !== conditions.conversationStatus) return false;
  }

  // pipelineKind (para eventos de stage/deal)
  if (conditions.pipelineKind) {
    const dealId = (event.payload as any)?.dealId;
    if (!dealId) return false;
    const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { pipeline: true } });
    if (!deal || deal.pipeline.kind !== conditions.pipelineKind) return false;
  }

  // noOpenDealInSalesPipeline
  if (conditions.noOpenDealInSalesPipeline) {
    const contactId = (event.payload as any)?.contactId;
    if (!contactId) return false;
    const sales = await prisma.pipeline.findFirst({ where: { orgId, kind: "sales" } });
    if (!sales) return true;
    const count = await prisma.deal.count({ where: { orgId, contactId, pipelineId: sales.id, status: "open" } });
    if (count > 0) return false;
  }

  return true;
}

/**
 * Worker — agora executa 3 actions essenciais:
 * - create_task
 * - move_to_pipeline
 * - send_message (stub)
 */
const worker = new Worker<JobData>(
  "events",
  async (job) => {
    const event = await prisma.event.findUnique({ where: { id: job.data.eventId } });
    if (!event || event.processed) return;

    const automations = await prisma.automation.findMany({
      where: { orgId: event.orgId, enabled: true, triggerType: event.type },
      orderBy: { createdAt: "asc" },
    });

    const logs: string[] = [];
    for (const a of automations) {
      try {
        const okTrigger = matchesTrigger(event, a);
        if (!okTrigger) {
          logs.push(`skip triggerConfig: ${a.name}`);
          await prisma.automationRun.create({
            data: { orgId: event.orgId, automationId: a.id, eventId: event.id, status: "skipped", log: "triggerConfig_no_match" },
          });
          continue;
        }

        const okCond = await evaluateConditions(event.orgId, event, a.conditions);
        if (!okCond) {
          logs.push(`skip conditions: ${a.name}`);
          await prisma.automationRun.create({
            data: { orgId: event.orgId, automationId: a.id, eventId: event.id, status: "skipped", log: "conditions_no_match" },
          });
          continue;
        }

        const actions: Action[] = Array.isArray(a.actions) ? a.actions : [];
        const results = [];
        for (const act of actions) {
          const r = await executeAction(event.orgId, event, act);
          results.push({ action: actionToText(act), result: r });
        }

        await prisma.automationRun.create({
          data: {
            orgId: event.orgId,
            automationId: a.id,
            eventId: event.id,
            status: "success",
            log: JSON.stringify(results).slice(0, 5000),
          },
        });
      } catch (err: any) {
        await prisma.automationRun.create({
          data: { orgId: event.orgId, automationId: a.id, eventId: event.id, status: "error", log: String(err?.message ?? err).slice(0, 5000) },
        });
      }
    }

    await prisma.event.update({ where: { id: event.id }, data: { processed: true } });
    return { processed: true, ran: automations.length, logs };
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => console.log("job completed", job.id));
worker.on("failed", (job, err) => console.error("job failed", job?.id, err));
console.log("Solutions worker running (queue: events)");
