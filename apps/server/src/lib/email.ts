/**
 * Envio de e-mails transacionais (boas-vindas, etc.) via Resend.
 * Degrada graciosamente: sem RESEND_API_KEY, apenas não envia (não quebra o cadastro).
 */
const RESEND_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Solutions CRM <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "https://solutionscrm.com.br";

export function emailEnabled() {
  return !!RESEND_KEY;
}

function firstName(name: string) {
  return (name || "").trim().split(/\s+/)[0] || "";
}

/** Template HTML do e-mail de boas-vindas (tecnológico, responsivo, compatível com clientes de e-mail). */
function welcomeHtml(params: { name: string; orgName?: string }) {
  const first = firstName(params.name) || "vendedor";
  const org = params.orgName ? ` da <strong>${params.orgName}</strong>` : "";
  return `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05070f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070f;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0b1220;border:1px solid #1e293b;border-radius:18px;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#0a1d44 0%,#0d2347 45%,#06101f 100%);padding:36px 36px 28px;">
          <table role="presentation" width="100%"><tr>
            <td style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:.5px;"><img src="${APP_URL}/logo.jpeg" width="40" height="40" alt="Solutions" style="border-radius:11px;vertical-align:middle;margin-right:12px;">Solutions <span style="color:#38bdf8;">CRM</span></td>
            <td align="right" style="font-size:11px;color:#7dd3fc;letter-spacing:2px;text-transform:uppercase;">Inteligência Artificial</td>
          </tr></table>
          <div style="margin-top:26px;font-size:32px;line-height:1.2;font-weight:800;color:#ffffff;">
            Bem-vindo(a), ${first}! <span style="font-size:30px;">🚀</span>
          </div>
          <div style="margin-top:10px;font-size:16px;color:#9fb6d6;">
            Sua conta${org} está pronta. Os próximos clientes já podem ser atendidos no automático.
          </div>
        </td></tr>

        <tr><td style="padding:30px 36px 8px;">
          <div style="font-size:15px;color:#cbd5e1;line-height:1.65;">
            Você acaba de entrar no CRM conversacional que reúne <strong style="color:#fff;">WhatsApp + Instagram</strong>,
            funil de vendas e uma <strong style="color:#7dd3fc;">IA que atende, qualifica e responde sozinha 24/7</strong>.
            Seu <strong style="color:#34d399;">teste grátis de 14 dias</strong> começou agora.
          </div>
        </td></tr>

        <tr><td align="center" style="padding:24px 36px 8px;">
          <a href="${APP_URL}" style="display:inline-block;background:#38bdf8;color:#06101f;font-weight:700;font-size:16px;text-decoration:none;padding:14px 34px;border-radius:14px;">
            Acessar meu painel →
          </a>
        </td></tr>

        <tr><td style="padding:18px 36px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${[
              ["💬", "Conecte WhatsApp e Instagram", "Todas as conversas numa caixa só."],
              ["🤖", "Ligue o Agente de IA", "Ele responde e qualifica os leads por você."],
              ["📊", "Acompanhe o funil e o BI", "Veja vendas, conversão e leads quentes."],
            ].map(([ic, t, d]) => `
            <tr><td style="padding:10px 0;border-bottom:1px solid #16233c;">
              <table role="presentation"><tr>
                <td valign="top" style="font-size:22px;padding-right:14px;">${ic}</td>
                <td><div style="font-size:15px;font-weight:600;color:#ffffff;">${t}</div>
                <div style="font-size:13px;color:#8aa0bd;margin-top:2px;">${d}</div></td>
              </tr></table>
            </td></tr>`).join("")}
          </table>
        </td></tr>

        <tr><td style="padding:22px 36px 30px;">
          <div style="font-size:13px;color:#8aa0bd;line-height:1.6;">
            Precisa de ajuda pra começar? É só responder este e-mail. Estamos aqui pra você vender mais com menos esforço. 💪
          </div>
        </td></tr>

        <tr><td style="background:#06101f;padding:20px 36px;border-top:1px solid #16233c;">
          <div style="font-size:12px;color:#64748b;">Solutions CRM — A tecnologia que impulsiona o seu futuro.</div>
          <div style="font-size:12px;color:#475569;margin-top:4px;">
            <a href="${APP_URL}" style="color:#38bdf8;text-decoration:none;">solutionscrm.com.br</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Envia o e-mail de boas-vindas (best-effort). */
export async function sendWelcomeEmail(params: { to: string; name: string; orgName?: string }) {
  if (!RESEND_KEY) return { sent: false, note: "email_not_configured" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: `Bem-vindo(a) ao Solutions CRM, ${firstName(params.name)}! 🚀`,
        html: welcomeHtml(params),
      }),
    });
    const data: any = await r.json();
    return { sent: r.ok, status: r.status, data };
  } catch (err: any) {
    return { sent: false, error: String(err?.message ?? err) };
  }
}

/** Template do e-mail de recuperação de senha (código grande e destacado). */
function resetHtml(params: { name: string; code: string }) {
  const first = firstName(params.name) || "";
  return `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05070f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070f;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0b1220;border:1px solid #1e293b;border-radius:18px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0a1d44 0%,#0d2347 45%,#06101f 100%);padding:30px 36px 24px;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;"><img src="${APP_URL}/logo.jpeg" width="36" height="36" alt="Solutions" style="border-radius:10px;vertical-align:middle;margin-right:10px;">Solutions <span style="color:#38bdf8;">CRM</span></div>
        </td></tr>
        <tr><td style="padding:30px 36px 8px;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;">Recuperação de senha</div>
          <div style="margin-top:10px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            ${first ? `Olá, ${first}. ` : ""}Use o código abaixo para redefinir a sua senha. Ele vale por <strong style="color:#fff;">30 minutos</strong>.
          </div>
        </td></tr>
        <tr><td align="center" style="padding:22px 36px 8px;">
          <div style="display:inline-block;background:#06101f;border:1px solid #1e293b;border-radius:14px;padding:16px 30px;font-size:34px;font-weight:800;letter-spacing:10px;color:#38bdf8;">${params.code}</div>
        </td></tr>
        <tr><td style="padding:18px 36px 28px;">
          <div style="font-size:13px;color:#8aa0bd;line-height:1.6;">
            Digite esse código na tela de login, na opção "Esqueci a senha", e escolha uma nova senha.
            Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.
          </div>
        </td></tr>
        <tr><td style="background:#06101f;padding:18px 36px;border-top:1px solid #16233c;">
          <div style="font-size:12px;color:#64748b;">Solutions CRM — A tecnologia que impulsiona o seu futuro.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Envia o e-mail com o código de recuperação (best-effort). */
export async function sendPasswordResetEmail(params: { to: string; name: string; code: string }) {
  if (!RESEND_KEY) return { sent: false, note: "email_not_configured" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: `Seu código de recuperação: ${params.code}`,
        html: resetHtml(params),
      }),
    });
    const data: any = await r.json();
    return { sent: r.ok, status: r.status, data };
  } catch (err: any) {
    return { sent: false, error: String(err?.message ?? err) };
  }
}

export { welcomeHtml };
