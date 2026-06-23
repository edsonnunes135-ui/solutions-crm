/**
 * Widget de chat no site (canal "webchat"). PÚBLICO (sem login) — roda no site
 * do cliente. O visitante manda mensagem → cria contato/conversa → roda os fluxos
 * no-code (mesma engine do WhatsApp) → devolve as respostas. Mensagens tardias
 * (ex.: humano respondendo pelo Inbox) chegam por polling.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { findOrCreateContactByIdentity, upsertConversationForContact, insertInboundMessageIfNew } from "../lib/meta";
import { runMatchingFlow } from "../lib/flows";
import { pushToOrg } from "../lib/push";

export const widgetRouter = Router();

// Marca do parceiro pra o widget se vestir (cor + nome)
widgetRouter.get("/widget/:orgId/config", async (req, res) => {
  const orgId = String(req.params.orgId);
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  if (!org) return res.status(404).json({ error: "org_not_found" });
  const s = await prisma.orgSetting.findUnique({ where: { orgId }, select: { brandName: true, brandColor: true } });
  res.json({ name: s?.brandName || org.name || "Atendimento", color: s?.brandColor || "#0ea5e9" });
});

// Visitante envia mensagem → cria/atualiza conversa, roda os fluxos, devolve respostas
const MsgBody = z.object({
  sessionId: z.string().min(6).max(64),
  text: z.string().min(1).max(2000),
  name: z.string().max(80).optional(),
  email: z.string().email().optional(),
});
widgetRouter.post("/widget/:orgId/message", async (req, res) => {
  const orgId = String(req.params.orgId);
  const parsed = MsgBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return res.status(404).json({ error: "org_not_found" });
  const { sessionId, text, name } = parsed.data;

  const contact = await findOrCreateContactByIdentity({ orgId, channel: "webchat" as any, senderExternalId: sessionId, senderName: name || "Visitante do site" });
  const conv = await upsertConversationForContact({ orgId, contactId: contact.id, channel: "webchat" as any, conversationExternalId: sessionId });
  const inserted = await insertInboundMessageIfNew({ orgId, conversationId: conv.id, channel: "webchat" as any, externalId: `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, text });
  if (!inserted.created || !inserted.message) return res.json({ replies: [] });

  pushToOrg(orgId, { title: `💬 Mensagem do site (${contact.name})`, body: text.slice(0, 120), url: "/" }).catch(() => {});

  const inboundCount = await prisma.message.count({ where: { orgId, conversationId: conv.id, direction: "inbound" } });
  try {
    await runMatchingFlow({ orgId, conversationId: conv.id, contactId: contact.id, contactName: contact.name, channel: "webchat", text, isFirstInbound: inboundCount <= 1 });
  } catch {
    /* fluxos são best-effort */
  }

  const replies = await prisma.message.findMany({
    where: { orgId, conversationId: conv.id, direction: "outbound", sentAt: { gt: inserted.message.sentAt } },
    orderBy: { sentAt: "asc" },
    select: { text: true, sentAt: true },
  });
  res.json({ replies: replies.map((m) => ({ text: m.text, at: m.sentAt })) });
});

// Polling: respostas novas (ex.: humano respondeu pelo Inbox) desde "after"
widgetRouter.get("/widget/:orgId/poll", async (req, res) => {
  const orgId = String(req.params.orgId);
  const sessionId = String(req.query.sessionId || "");
  const after = req.query.after ? new Date(String(req.query.after)) : new Date(0);
  if (!sessionId) return res.json({ replies: [] });
  const conv = await prisma.conversation.findFirst({ where: { orgId, channel: "webchat" as any, externalId: sessionId }, select: { id: true } });
  if (!conv) return res.json({ replies: [] });
  const replies = await prisma.message.findMany({
    where: { orgId, conversationId: conv.id, direction: "outbound", sentAt: { gt: after } },
    orderBy: { sentAt: "asc" },
    select: { text: true, sentAt: true },
  });
  res.json({ replies: replies.map((m) => ({ text: m.text, at: m.sentAt })) });
});

// Script embutível: o cliente cola <script src=".../widget.js" data-org="ORGID"></script>
const WIDGET_JS = `(function(){
  var s = document.currentScript; if(!s) return;
  var org = s.getAttribute('data-org'); if(!org) return;
  var api = s.src.split('/widget.js')[0];
  var KEY = 'sccw_'+org;
  var session = localStorage.getItem(KEY);
  if(!session){ session='wc_'+Date.now()+'_'+Math.random().toString(36).slice(2,10); localStorage.setItem(KEY, session); }
  var lastAt=null, color='#0ea5e9', name='Atendimento';
  var css='.sccw-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);z-index:2147483000;font-size:24px}'
   +'.sccw-panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'
   +'.sccw-head{padding:14px 16px;color:#fff;font-weight:600}'
   +'.sccw-body{flex:1;overflow-y:auto;padding:12px;background:#f7f8fa;display:flex;flex-direction:column;gap:8px}'
   +'.sccw-msg{max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.35;white-space:pre-wrap}'
   +'.sccw-in{align-self:flex-start;background:#fff;border:1px solid #eee;color:#222}'
   +'.sccw-out{align-self:flex-end;color:#fff}'
   +'.sccw-foot{display:flex;gap:6px;padding:8px;border-top:1px solid #eee;background:#fff}'
   +'.sccw-foot input{flex:1;border:1px solid #ddd;border-radius:10px;padding:8px 10px;font-size:14px;outline:none}'
   +'.sccw-foot button{border:none;border-radius:10px;padding:0 14px;color:#fff;cursor:pointer;font-size:14px}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  var btn=document.createElement('button'); btn.className='sccw-btn'; btn.innerHTML='\\uD83D\\uDCAC';
  var panel=document.createElement('div'); panel.className='sccw-panel';
  panel.innerHTML='<div class="sccw-head"></div><div class="sccw-body"></div><div class="sccw-foot"><input placeholder="Escreva sua mensagem..."><button>Enviar</button></div>';
  document.body.appendChild(btn); document.body.appendChild(panel);
  var head=panel.querySelector('.sccw-head'), body=panel.querySelector('.sccw-body'), input=panel.querySelector('input'), sendBtn=panel.querySelector('button');
  function applyBrand(){ btn.style.background=color; head.style.background=color; sendBtn.style.background=color; head.textContent=name; }
  function addMsg(t,dir){ var d=document.createElement('div'); d.className='sccw-msg '+(dir==='out'?'sccw-out':'sccw-in'); d.textContent=t; if(dir==='out') d.style.background=color; body.appendChild(d); body.scrollTop=body.scrollHeight; }
  fetch(api+'/widget/'+org+'/config').then(function(r){return r.json();}).then(function(c){ if(c){ color=c.color||color; name=c.name||name; applyBrand(); } }).catch(function(){});
  var open=false; btn.onclick=function(){ open=!open; panel.style.display=open?'flex':'none'; if(open) input.focus(); };
  function send(){ var t=(input.value||'').trim(); if(!t) return; input.value=''; addMsg(t,'out');
    fetch(api+'/widget/'+org+'/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session,text:t})})
     .then(function(r){return r.json();}).then(function(d){ (d.replies||[]).forEach(function(m){ addMsg(m.text,'in'); lastAt=m.at; }); }).catch(function(){}); }
  sendBtn.onclick=send; input.addEventListener('keydown',function(e){ if(e.key==='Enter') send(); });
  setInterval(function(){ if(!lastAt) return; fetch(api+'/widget/'+org+'/poll?sessionId='+encodeURIComponent(session)+'&after='+encodeURIComponent(lastAt))
   .then(function(r){return r.json();}).then(function(d){ (d.replies||[]).forEach(function(m){ addMsg(m.text,'in'); lastAt=m.at; }); }).catch(function(){}); }, 5000);
})();`;

widgetRouter.get("/widget.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(WIDGET_JS);
});
