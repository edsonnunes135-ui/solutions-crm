import { prisma } from "./prisma";

export type SendResult = { sent: boolean; externalId?: string | null; error?: string; note?: string };

/**
 * Envia uma mensagem pelo canal real (WhatsApp Cloud API / Instagram Messaging API)
 * e registra a mensagem outbound no banco. Usado pelas rotas, pelo worker de
 * automações e pelas campanhas em massa.
 */
export async function sendChannelMessage(params: {
  orgId: string;
  conversationId: string;
  channel: "whatsapp" | "instagram";
  text: string;
}): Promise<SendResult & { messageId: string | null }> {
  const { orgId, conversationId, channel, text } = params;

  const conv = await prisma.conversation.findFirst({ where: { id: conversationId, orgId } });
  if (!conv) return { sent: false, error: "conversation_not_found", messageId: null };

  const msg = await prisma.message.create({
    data: { orgId, conversationId: conv.id, channel, direction: "outbound", text },
  });
  await prisma.conversation.update({ where: { id: conv.id }, data: { lastAt: new Date() } });

  const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
  const recipient = conv.externalId;

  let token: string | undefined;
  let endpoint: string | undefined;
  let body: any;

  if (channel === "whatsapp") {
    token = setting?.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = setting?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return { sent: false, note: "whatsapp_not_configured", messageId: msg.id };
    endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    body = { messaging_product: "whatsapp", to: recipient, type: "text", text: { body: text } };
  } else {
    token = setting?.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) return { sent: false, note: "instagram_not_configured", messageId: msg.id };
    // API do Instagram (login do Instagram): envia pela própria conta via graph.instagram.com.
    endpoint = `https://graph.instagram.com/v21.0/me/messages`;
    body = { recipient: { id: recipient }, message: { text } };
  }

  if (!recipient) return { sent: false, note: "no_external_identity", messageId: msg.id };

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data: any = await r.json();
    if (!r.ok) return { sent: false, error: data?.error?.message ?? "meta_error", messageId: msg.id };

    const externalId = channel === "whatsapp" ? data?.messages?.[0]?.id ?? null : data?.message_id ?? null;
    if (externalId) await prisma.message.update({ where: { id: msg.id }, data: { externalId } });
    return { sent: true, externalId, messageId: msg.id };
  } catch (err: any) {
    return { sent: false, error: String(err?.message ?? err), messageId: msg.id };
  }
}
