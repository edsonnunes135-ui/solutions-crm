import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { sendChannelMessage } from "../lib/send";

/**
 * Endpoints de envio e configuração de canais.
 */
export const channelsRouter = Router();
channelsRouter.use(requireAuth);

/**
 * Inscreve a conta WhatsApp Business (WABA) no app, para que as mensagens
 * recebidas cheguem ao nosso webhook. Necessário ao conectar um número novo.
 * Usa o token salvo da organização.
 */
/**
 * Diagnóstico do WhatsApp: usa o token salvo para checar o status real do
 * número e da conta na Meta (registrado? plataforma Cloud API? assinado?).
 */
channelsRouter.get("/channels/whatsapp/diagnose", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
  const token = setting?.whatsappAccessToken;
  const phoneId = setting?.whatsappPhoneNumberId;
  if (!token || !phoneId) return res.status(400).json({ error: "missing_config" });

  async function g(path: string) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${path}`, { headers: { Authorization: `Bearer ${token}` } });
      return { status: r.status, body: await r.json() };
    } catch (e: any) { return { error: String(e?.message ?? e) }; }
  }

  const phone = await g(`${phoneId}?fields=id,display_phone_number,verified_name,code_verification_status,platform_type,status,quality_rating,name_status`);
  const wabaId = (req.query.wabaId as string) || "";
  const subscribed = wabaId ? await g(`${wabaId}/subscribed_apps`) : null;
  res.json({ phoneNumberId: phoneId, phone, subscribed });
});

/**
 * Registra (ativa) o número na Cloud API com um PIN de 6 dígitos.
 * Última etapa para o número sair de PENDING e passar a receber/enviar.
 */
const RegisterBody = z.object({ pin: z.string().regex(/^\d{6}$/) });
channelsRouter.post("/channels/whatsapp/register", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_pin", note: "Informe um PIN de 6 dígitos." });

  const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
  const token = setting?.whatsappAccessToken;
  const phoneId = setting?.whatsappPhoneNumberId;
  if (!token || !phoneId) return res.status(400).json({ error: "missing_config" });

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: parsed.data.pin }),
    });
    const data: any = await r.json();
    return res.json({ ok: r.ok, status: r.status, data });
  } catch (err: any) {
    return res.status(502).json({ ok: false, error: String(err?.message ?? err) });
  }
});

const SubscribeBody = z.object({ wabaId: z.string().min(5) });
channelsRouter.post("/channels/whatsapp/subscribe", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
  const token = setting?.whatsappAccessToken;
  if (!token) return res.status(400).json({ error: "no_token", note: "Salve o token do WhatsApp primeiro." });

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${parsed.data.wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await r.json();
    return res.json({ ok: r.ok, status: r.status, data });
  } catch (err: any) {
    return res.status(502).json({ ok: false, error: String(err?.message ?? err) });
  }
});

/**
 * Conecta o Instagram automaticamente a partir de UM token (de usuário/system user
 * ou de página). Descobre a Página + a conta Instagram vinculada, salva a config
 * (page id p/ envio), registra o ChannelAccount (ig business id p/ rotear o inbound)
 * e assina os webhooks de mensagens da Página. Lê o token salvo em Configurações
 * (ou aceita { token } no corpo) — assim o segredo não precisa trafegar no chat.
 */
channelsRouter.post("/channels/instagram/connect", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
  const token = (typeof req.body?.token === "string" && req.body.token) || setting?.instagramAccessToken;
  if (!token) return res.status(400).json({ error: "no_token", note: "Cole o token do Instagram em Configurações primeiro." });

  async function gIg(path: string) {
    try {
      const url = `https://graph.instagram.com/v21.0/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token!)}`;
      const r = await fetch(url);
      return { status: r.status, body: (await r.json()) as any };
    } catch (e: any) { return { status: 0, body: { error: String(e?.message ?? e) } }; }
  }
  async function gFb(path: string) {
    try {
      const url = `https://graph.facebook.com/v21.0/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token!)}`;
      const r = await fetch(url);
      return { status: r.status, body: (await r.json()) as any };
    } catch (e: any) { return { status: 0, body: { error: String(e?.message ?? e) } }; }
  }

  // Registra um ChannelAccount do Instagram para a org (rotear inbound por esse id)
  async function linkIg(externalId: string, username: string) {
    if (!externalId) return;
    await prisma.channelAccount.upsert({
      where: { orgId_channel_externalAccountId: { orgId, channel: "instagram", externalAccountId: externalId } } as any,
      update: { displayName: username ? "@" + username : "Instagram" },
      create: { orgId, channel: "instagram", externalAccountId: externalId, displayName: username ? "@" + username : "Instagram" },
    });
  }

  // 1) Token de LOGIN DO INSTAGRAM (graph.instagram.com) — caminho atual
  const igMe = await gIg("me?fields=user_id,username,name");
  if (igMe.status === 200 && (igMe.body?.user_id || igMe.body?.id)) {
    const userId = String(igMe.body.user_id || "");
    const scopedId = String(igMe.body.id || "");
    const username = igMe.body.username || "";
    // registra os dois ids possíveis para casar com o que o webhook enviar
    await linkIg(userId, username);
    if (scopedId && scopedId !== userId) await linkIg(scopedId, username);
    await prisma.orgSetting.update({ where: { orgId }, data: { instagramAccessToken: token!, instagramPageId: userId || scopedId } });
    return res.json({ ok: true, mode: "instagram_login", igUserId: userId, igScopedId: scopedId, igUsername: username });
  }

  // 2) Fallback: token de usuário/página do Facebook → resolve Página + conta IG
  let pageId = "", pageToken = "", igId = "", igUsername = "", pageName = "";
  const accts = await gFb("me/accounts?fields=id,name,access_token,instagram_business_account{id,username}");
  const pages = Array.isArray(accts.body?.data) ? accts.body.data : [];
  const chosen = pages.find((p: any) => p?.instagram_business_account?.id) || pages[0];
  if (chosen?.id) {
    pageId = String(chosen.id); pageToken = chosen.access_token || token!; pageName = chosen.name || "";
    igId = chosen.instagram_business_account?.id || ""; igUsername = chosen.instagram_business_account?.username || "";
  } else {
    const me = await gFb("me?fields=id,name,instagram_business_account{id,username}");
    if (me.body?.id) {
      pageId = String(me.body.id); pageToken = token!; pageName = me.body.name || "";
      igId = me.body.instagram_business_account?.id || ""; igUsername = me.body.instagram_business_account?.username || "";
    }
  }

  if (!pageId) return res.status(400).json({ error: "no_account", note: "O token não foi reconhecido nem como login do Instagram nem como Página do Facebook. Gere um token de acesso do Instagram na configuração do app.", debugIg: igMe.body, debugFb: accts.body });
  if (!igId) return res.status(400).json({ error: "no_ig_account", note: "A Página não tem conta do Instagram vinculada.", pageId, pageName });

  await prisma.orgSetting.update({ where: { orgId }, data: { instagramAccessToken: pageToken, instagramPageId: pageId } });
  await linkIg(igId, igUsername);
  let subscribe: any = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
      body: JSON.stringify({ subscribed_fields: ["messages", "messaging_postbacks", "message_reactions"] }),
    });
    subscribe = { status: r.status, body: await r.json() };
  } catch (e: any) { subscribe = { error: String(e?.message ?? e) }; }
  return res.json({ ok: true, mode: "facebook_login", pageId, pageName, igId, igUsername, subscribe });
});

/** Diagnóstico do Instagram: o que o token salvo enxerga (páginas + conta IG). */
channelsRouter.get("/channels/instagram/diagnose", requireRole("owner", "partner", "admin"), async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const setting = await prisma.orgSetting.findUnique({ where: { orgId } });
  const token = setting?.instagramAccessToken;
  if (!token) return res.status(400).json({ error: "no_token" });
  async function gIg(path: string) {
    try {
      const r = await fetch(`https://graph.instagram.com/v21.0/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token!)}`);
      return { status: r.status, body: await r.json() };
    } catch (e: any) { return { status: 0, body: { error: String(e?.message ?? e) } }; }
  }
  async function gFb(path: string) {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token!)}`);
      return { status: r.status, body: await r.json() };
    } catch (e: any) { return { status: 0, body: { error: String(e?.message ?? e) } }; }
  }
  const igMe = await gIg("me?fields=user_id,username,name");
  const fbAccounts = await gFb("me/accounts?fields=id,name,instagram_business_account{id,username}");
  const accounts = await prisma.channelAccount.findMany({ where: { orgId, channel: "instagram" }, select: { externalAccountId: true, displayName: true } });
  res.json({ savedId: setting?.instagramPageId || null, instagramLogin: igMe, facebookPages: fbAccounts, registered: accounts });
});

/**
 * Contas conectadas (multi-tenant mapping)
 * - WhatsApp: externalAccountId = phone_number_id
 * - Instagram: externalAccountId = recipient/page/ig id
 */

const AccountSchema = z.object({
  channel: z.enum(["whatsapp", "instagram"]),
  externalAccountId: z.string().min(3),
  displayName: z.string().optional(),
});

channelsRouter.get("/channels/accounts", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const accounts = await prisma.channelAccount.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ ok: true, accounts });
});

channelsRouter.post("/channels/accounts", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = AccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const acc = await prisma.channelAccount.upsert({
    where: { orgId_channel_externalAccountId: { orgId, channel: parsed.data.channel, externalAccountId: parsed.data.externalAccountId } } as any,
    update: { displayName: parsed.data.displayName ?? null },
    create: { orgId, channel: parsed.data.channel, externalAccountId: parsed.data.externalAccountId, displayName: parsed.data.displayName ?? null },
  });

  res.json({ ok: true, account: acc });
});

channelsRouter.delete("/channels/accounts/:id", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const id = req.params.id;
  const deleted = await prisma.channelAccount.deleteMany({ where: { id: String(id), orgId } });
  res.json({ ok: true, deleted: deleted.count });
});

const SendSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1),
  channel: z.enum(["whatsapp", "instagram", "webchat"]),
});

channelsRouter.post("/channels/send", async (req: AuthedRequest, res) => {
  const orgId = req.user!.orgId;
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const r = await sendChannelMessage({
    orgId,
    conversationId: parsed.data.conversationId,
    channel: parsed.data.channel,
    text: parsed.data.text,
  });

  if (r.error === "conversation_not_found") return res.status(404).json({ error: r.error });

  const noteMap: Record<string, string> = {
    whatsapp_not_configured: "configure o WhatsApp em Configurações",
    instagram_not_configured: "configure o Instagram em Configurações",
    no_external_identity: "conversa sem identidade externa (contato precisa ter mandado mensagem antes)",
  };

  res.json({
    ok: !r.error,
    sent: r.sent,
    externalId: r.externalId ?? null,
    note: r.note ? noteMap[r.note] ?? r.note : r.error,
    messageId: r.messageId,
  });
});
