import { prisma } from "./prisma";

type NormalizedInbound = {
  channel: "whatsapp" | "instagram";
  externalAccountId?: string; // phone_number_id / recipient id / ig business id
  senderExternalId: string;   // wa_id / ig sender id
  senderName?: string;
  messageExternalId: string;  // wamid.* / mid.*
  text: string;
  timestamp?: number | string;
};

function safeString(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pickTextFromWhatsAppMessage(m: any): string {
  const t = safeString(m?.type);
  if (t === "text") return safeString(m?.text?.body);
  if (t === "interactive") return safeString(m?.interactive?.button_reply?.title || m?.interactive?.list_reply?.title || "interactive");
  if (t === "reaction") return `reaction:${safeString(m?.reaction?.emoji)}`;
  if (t === "location") return `location:${safeString(m?.location?.name || "")} ${safeString(m?.location?.address || "")}`.trim();
  if (t === "image" || t === "video" || t === "audio" || t === "document" || t === "sticker") return `${t}:${safeString(m?.id)}`;
  return t ? `[${t}]` : "[message]";
}

function detectChannel(body: any): "whatsapp" | "instagram" | "unknown" {
  const obj = safeString(body?.object).toLowerCase();
  if (obj.includes("whatsapp")) return "whatsapp";
  if (obj.includes("instagram")) return "instagram";
  // fallback: instagram payloads can be object:"page" too; detect by entry.messaging[0].message.mid
  if (Array.isArray(body?.entry) && body.entry.some((e: any) => Array.isArray(e?.messaging))) return "instagram";
  return "unknown";
}

export function normalizeMetaWebhook(body: any): { channel: "whatsapp" | "instagram"; messages: NormalizedInbound[]; externalAccountId?: string } {
  const channel = detectChannel(body);
  const messages: NormalizedInbound[] = [];

  if (channel === "whatsapp") {
    const entry = Array.isArray(body?.entry) ? body.entry : [];
    for (const e of entry) {
      const changes = Array.isArray(e?.changes) ? e.changes : [];
      for (const c of changes) {
        const value = c?.value || {};
        const metadata = value?.metadata || {};
        const externalAccountId = safeString(metadata?.phone_number_id) || undefined;

        const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
        const contactMap = new Map<string, string>();
        for (const ct of contacts) {
          const waId = safeString(ct?.wa_id);
          const name = safeString(ct?.profile?.name);
          if (waId) contactMap.set(waId, name);
        }

        const msgs = Array.isArray(value?.messages) ? value.messages : [];
        for (const m of msgs) {
          const from = safeString(m?.from);
          const mid = safeString(m?.id);
          if (!from || !mid) continue;

          messages.push({
            channel: "whatsapp",
            externalAccountId,
            senderExternalId: from,
            senderName: contactMap.get(from) || undefined,
            messageExternalId: mid,
            text: pickTextFromWhatsAppMessage(m),
            timestamp: m?.timestamp,
          });
        }
      }
    }
    return { channel: "whatsapp", messages, externalAccountId: messages[0]?.externalAccountId };
  }

  if (channel === "instagram") {
    const entry = Array.isArray(body?.entry) ? body.entry : [];
    for (const e of entry) {
      const externalAccountId = safeString(e?.id) || undefined; // IG business id in many payloads

      const messaging = Array.isArray(e?.messaging) ? e.messaging : [];
      for (const ev of messaging) {
        const senderId = safeString(ev?.sender?.id);
        const recipientId = safeString(ev?.recipient?.id);
        const msg = ev?.message || {};
        const isEcho = Boolean(msg?.is_echo);
        const mid = safeString(msg?.mid);
        const text = safeString(msg?.text);

        if (!senderId || !mid) continue;
        if (isEcho) continue; // ignora eco de outbound

        messages.push({
          channel: "instagram",
          externalAccountId: recipientId || externalAccountId,
          senderExternalId: senderId,
          senderName: undefined,
          messageExternalId: mid,
          text: text || "[message]",
          timestamp: ev?.timestamp,
        });
      }
    }
    return { channel: "instagram", messages, externalAccountId: messages[0]?.externalAccountId };
  }

  return { channel: "instagram", messages: [], externalAccountId: undefined };
}

export async function resolveOrgIdForMetaWebhook(input: { channel: "whatsapp" | "instagram"; externalAccountId?: string; headerOrgId?: string | null }) {
  const headerOrgId = input.headerOrgId || null;
  if (input.externalAccountId) {
    const acc = await prisma.channelAccount.findFirst({
      where: { channel: input.channel as any, externalAccountId: input.externalAccountId },
      select: { orgId: true },
    });
    if (acc?.orgId) return acc.orgId;
  }
  return headerOrgId;
}

export async function findOrCreateContactByIdentity(args: {
  orgId: string;
  channel: "whatsapp" | "instagram";
  senderExternalId: string;
  senderName?: string;
}) {
  const { orgId, channel, senderExternalId } = args;
  const existing = await prisma.contactIdentity.findFirst({
    where: { orgId, channel: channel as any, externalId: senderExternalId },
    include: { contact: true },
  });
  if (existing?.contact) return existing.contact;

  const contact = await prisma.contact.create({
    data: {
      orgId,
      name: args.senderName?.trim() || (channel === "whatsapp" ? senderExternalId : `IG User ${senderExternalId}`),
      phone: channel === "whatsapp" ? senderExternalId : null,
      email: null,
      company: null,
    },
  });

  await prisma.contactIdentity.create({
    data: { orgId, contactId: contact.id, channel: channel as any, externalId: senderExternalId },
  });

  return contact;
}

export async function upsertConversationForContact(args: {
  orgId: string;
  contactId: string;
  channel: "whatsapp" | "instagram";
  conversationExternalId: string; // per contact
}) {
  const { orgId, contactId, channel, conversationExternalId } = args;

  const conv = await prisma.conversation.upsert({
    where: { orgId_channel_externalId: { orgId, channel: channel as any, externalId: conversationExternalId } } as any,
    update: { contactId, lastAt: new Date() },
    create: {
      orgId,
      contactId,
      channel: channel as any,
      externalId: conversationExternalId,
      status: "open",
      lastAt: new Date(),
    },
  });

  return conv;
}

export async function insertInboundMessageIfNew(args: {
  orgId: string;
  conversationId: string;
  channel: "whatsapp" | "instagram";
  externalId: string;
  text: string;
}) {
  try {
    const msg = await prisma.message.create({
      data: {
        orgId: args.orgId,
        conversationId: args.conversationId,
        channel: args.channel as any,
        direction: "inbound",
        text: args.text,
        externalId: args.externalId,
      },
    });
    await prisma.conversation.update({ where: { id: args.conversationId }, data: { lastAt: new Date() } });
    return { created: true as const, message: msg };
  } catch (e: any) {
    // provável duplicidade (webhook retry). Ignora.
    return { created: false as const, message: null };
  }
}
