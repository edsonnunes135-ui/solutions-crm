import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Camada de internacionalização (PT / EN / ES) — leve, sem dependência externa.
 * O idioma é detectado pelo navegador (Brasil = PT, espanhol = ES, resto = EN),
 * pode ser trocado no seletor e fica salvo no localStorage.
 *
 * Como usar:
 *   const { lang, setLang } = useLang();
 *   const L = landing[lang];   // conteúdo da landing já no idioma certo
 */

export type Lang = "pt" | "en" | "es";
export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "pt" || saved === "en" || saved === "es") return saved;
  } catch { /* ignore */ }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "pt").toLowerCase();
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; }
const Ctx = createContext<LangCtx>({ lang: "pt", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");
  // detecta só no cliente (evita divergência SSR/CSR)
  useEffect(() => { setLangState(detectLang()); }, []);
  useEffect(() => { try { document.documentElement.lang = lang; } catch { /* ignore */ } }, [lang]);
  const setLang = (l: Lang) => {
    try { localStorage.setItem("lang", l); } catch { /* ignore */ }
    setLangState(l);
  };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() { return useContext(Ctx); }

/** Seletor de idioma (botões PT/EN/ES). `variant="dark"` para fundos escuros. */
export function LanguageSelector({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { lang, setLang } = useLang();
  const base = variant === "dark"
    ? { on: "bg-white/15 text-white", off: "text-slate-300 hover:text-white", wrap: "border-white/20" }
    : { on: "bg-slate-900 text-white", off: "text-slate-500 hover:text-slate-900", wrap: "border-slate-200" };
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full border ${base.wrap} p-0.5`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-full px-2 py-1 text-xs font-medium transition ${lang === l.code ? base.on : base.off}`}
          aria-label={l.label}
          title={l.label}
        >
          {l.flag} {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────── Conteúdo da Landing ───────────────────────────

export interface LandingContent {
  nav: { features: string; ai: string; plans: string; faq: string; login: string; tryFree: string };
  hero: { badge: string; title1: string; title2: string; subtitle: string; cta: string; haveAccount: string; noCard: string };
  stats: { aiDaily: string; channels: string; freeDays: string; daysSuffix: string; setup: string; toTest: string };
  features: { title: string; subtitle: string; cards: { title: string; desc: string }[] };
  ai: { badge: string; title: string; subtitle: string; bullets: string[]; cta: string; demoTitle: string; demoStatus: string; demoFooter: string; chat: { from: "client" | "ai"; text: string }[] };
  steps: { title: string; items: { t: string; d: string }[] };
  integrationsLabel: string;
  plans: {
    title: string; subtitle: string; monthly: string; annual: string; save: string; popular: string;
    perUserMonth: string; billedYear: string; startFree: string; securePay: string;
    compareTitle: string; featureCol: string; items: { starter: string[]; pro: string[]; business: string[] }; rows: { label: string; values: (string | boolean)[] }[];
  };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { title: string; subtitle: string; button: string };
  footer: { rights: string };
}

const pt: LandingContent = {
  nav: { features: "Recursos", ai: "IA ao vivo", plans: "Planos", faq: "Dúvidas", login: "Entrar", tryFree: "Teste grátis" },
  hero: {
    badge: "CRM conversacional com Inteligência Artificial",
    title1: "Transforme conversas", title2: "em vendas no automático",
    subtitle: "WhatsApp e Instagram em um só lugar, funil visual e uma IA que responde sozinha, qualifica leads e fecha mais negócios. Tudo no Solutions.",
    cta: "Começar teste grátis de 14 dias", haveAccount: "Já tenho conta", noCard: "Sem cartão para testar",
  },
  stats: { aiDaily: "IA atendendo, todo dia", channels: "canais num só lugar", freeDays: "grátis para testar", daysSuffix: " dias", setup: "para configurar", toTest: "grátis para testar" },
  features: {
    title: "Tudo que sua equipe precisa para vender mais",
    subtitle: 'Do primeiro "oi" ao pagamento, em uma plataforma só.',
    cards: [
      { title: "Inbox omnichannel", desc: "WhatsApp e Instagram numa caixa única, com filas e atribuição por vendedor." },
      { title: "Agente de IA autônomo", desc: "Recebe, qualifica e responde sozinho 24/7, e passa a conversa para um humano na hora certa." },
      { title: "Copiloto de IA", desc: "Sugere respostas, resume conversas e pontua leads (quente/morno/frio) com explicação." },
      { title: "Funil visual", desc: "Arraste e solte negócios entre etapas, com motivos de perda e dono de cada deal." },
      { title: "Automações", desc: "Crie fluxos que respondem, etiquetam e criam tarefas automaticamente." },
      { title: "Campanhas em massa", desc: "Dispare mensagens segmentadas por tag e acompanhe entregas." },
      { title: "BI e painel do gestor", desc: "Receita, taxa de ganho, desempenho do time e motivos de perda em tempo real." },
      { title: "Equipe e papéis", desc: "CEO, sócio, gestor, vendedor e visualização, cada um com o acesso certo." },
      { title: "Seguro e na nuvem", desc: "Dados isolados por empresa, senha forte, e disponível de qualquer lugar." },
    ],
  },
  ai: {
    badge: "Inteligência Artificial",
    title: "Sua IA atende, qualifica e vende sozinha",
    subtitle: "Enquanto você cuida do negócio, o agente de IA responde os clientes na hora, entende o que precisam e só te chama quando o lead esquenta. Veja ao lado uma conversa real acontecendo no automático.",
    bullets: ["Responde 24 horas por dia, 7 dias por semana", "Pontua cada lead (quente, morno, frio) automaticamente", "Passa para um atendente humano na hora certa"],
    cta: "Quero a IA atendendo por mim",
    demoTitle: "Atendimento Solutions", demoStatus: "IA respondendo • online", demoFooter: "Resposta gerada automaticamente pela IA",
    chat: [
      { from: "client", text: "Oi! Vocês têm horário amanhã? 😊" },
      { from: "ai", text: "Olá! Tenho sim 👋 Prefere de manhã ou à tarde?" },
      { from: "client", text: "De manhã, uns 10h" },
      { from: "ai", text: "Fechado! Reservei amanhã às 10h e já te mando o lembrete. Posso ajudar em mais algo?" },
      { from: "client", text: "Perfeito, obrigado!" },
    ],
  },
  steps: {
    title: "Comece em 3 passos",
    items: [
      { t: "Crie sua conta", d: "Teste grátis por 14 dias, sem cartão." },
      { t: "Conecte WhatsApp e Instagram", d: "Centralize todas as conversas em minutos." },
      { t: "Venda no automático", d: "Deixe a IA responder, qualificar e organizar seu funil." },
    ],
  },
  integrationsLabel: "Conecta com as ferramentas que você já usa",
  plans: {
    title: "Planos que cabem no seu negócio",
    subtitle: "Por usuário/mês. Cancele quando quiser. 14 dias grátis em qualquer plano.",
    monthly: "Mensal", annual: "Anual", save: "economize 20%", popular: "Mais popular",
    perUserMonth: "/usuário/mês", billedYear: "cobrado R$ {v}/ano por usuário", startFree: "Começar grátis",
    securePay: "Pagamento seguro via Mercado Pago (cartão ou Pix). Renovação automática, cancele a qualquer momento.",
    compareTitle: "Compare os planos em detalhe", featureCol: "Recurso",
    items: {
      starter: ["2 usuários", "1.000 contatos", "WhatsApp + Instagram", "Funil e tarefas", "5 automações"],
      pro: ["10 usuários", "10.000 contatos", "Campanhas em massa", "IA copiloto + lead scoring", "50 automações", "Filas de atendimento"],
      business: ["Usuários ilimitados", "100.000 contatos", "Tudo do Pro", "Automações ilimitadas", "Suporte prioritário"],
    },
    rows: [
      { label: "Usuários", values: ["2", "10", "Ilimitados"] },
      { label: "Contatos", values: ["1.000", "10.000", "100.000"] },
      { label: "WhatsApp + Instagram", values: [true, true, true] },
      { label: "Funil de vendas + tarefas", values: [true, true, true] },
      { label: "Automações / chatbot", values: ["5", "50", "Ilimitadas"] },
      { label: "IA: copiloto, resumo e lead scoring", values: [false, true, true] },
      { label: "Resposta automática com IA (24/7)", values: [false, true, true] },
      { label: "Campanhas em massa", values: [false, true, true] },
      { label: "Filas de atendimento", values: [false, true, true] },
      { label: "Painel do gestor + BI", values: [true, true, true] },
      { label: "Notificações push", values: [true, true, true] },
      { label: "Suporte prioritário", values: [false, false, true] },
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      { q: "Preciso de cartão para testar?", a: "Não. Você cria a conta e usa por 14 dias grátis. Só paga se decidir continuar." },
      { q: "Funciona com WhatsApp oficial?", a: "Sim. O Solutions integra com a API oficial do WhatsApp (Meta) e com o Instagram Direct." },
      { q: "A IA responde sozinha de verdade?", a: "Sim. Com o agente de IA ativado, ele lê o histórico e responde o cliente na hora, 24/7, e você pode assumir a conversa quando quiser." },
      { q: "Consigo usar no celular?", a: "Sim. É um app instalável (PWA): adicione à tela inicial e use como um aplicativo, com notificações push." },
      { q: "Posso cancelar quando quiser?", a: "Sim, sem multa. A assinatura é mensal e o cancelamento é imediato pelo painel." },
      { q: "Posso usar com a minha própria marca?", a: "Sim. O Solutions é white-label: coloque seu logo, suas cores e seu nome, ideal para revender o sistema como se fosse seu." },
    ],
  },
  cta: { title: "Pronto para vender mais com menos esforço?", subtitle: "Comece agora. Em 5 minutos você está atendendo seus clientes com IA.", button: "Criar minha conta grátis" },
  footer: { rights: "Todos os direitos reservados." },
};

const en: LandingContent = {
  nav: { features: "Features", ai: "Live AI", plans: "Pricing", faq: "FAQ", login: "Log in", tryFree: "Free trial" },
  hero: {
    badge: "Conversational CRM powered by Artificial Intelligence",
    title1: "Turn conversations", title2: "into sales on autopilot",
    subtitle: "WhatsApp and Instagram in one place, a visual pipeline and an AI that replies on its own, qualifies leads and closes more deals. All in Solutions.",
    cta: "Start your 14-day free trial", haveAccount: "I already have an account", noCard: "No card required to try",
  },
  stats: { aiDaily: "AI answering, every day", channels: "channels in one place", freeDays: "free to try", daysSuffix: " days", setup: "to set up", toTest: "free to try" },
  features: {
    title: "Everything your team needs to sell more",
    subtitle: 'From the first "hi" to the payment, in a single platform.',
    cards: [
      { title: "Omnichannel inbox", desc: "WhatsApp and Instagram in one inbox, with queues and per-agent assignment." },
      { title: "Autonomous AI agent", desc: "Receives, qualifies and replies on its own 24/7, handing the chat to a human at the right moment." },
      { title: "AI copilot", desc: "Suggests replies, summarizes conversations and scores leads (hot/warm/cold) with reasoning." },
      { title: "Visual pipeline", desc: "Drag and drop deals between stages, with loss reasons and an owner for each deal." },
      { title: "Automations", desc: "Build flows that reply, tag and create tasks automatically." },
      { title: "Bulk campaigns", desc: "Send messages segmented by tag and track deliveries." },
      { title: "BI & manager dashboard", desc: "Revenue, win rate, team performance and loss reasons in real time." },
      { title: "Team & roles", desc: "CEO, partner, manager, agent and viewer, each with the right access." },
      { title: "Secure & in the cloud", desc: "Data isolated per company, strong passwords, available anywhere." },
    ],
  },
  ai: {
    badge: "Artificial Intelligence",
    title: "Your AI answers, qualifies and sells on its own",
    subtitle: "While you run the business, the AI agent replies to customers instantly, understands what they need and only calls you when the lead heats up. See a real conversation happening on autopilot.",
    bullets: ["Answers 24 hours a day, 7 days a week", "Scores each lead (hot, warm, cold) automatically", "Hands off to a human agent at the right time"],
    cta: "I want the AI answering for me",
    demoTitle: "Solutions Support", demoStatus: "AI replying • online", demoFooter: "Reply generated automatically by AI",
    chat: [
      { from: "client", text: "Hi! Do you have any openings tomorrow? 😊" },
      { from: "ai", text: "Hello! Yes, we do 👋 Morning or afternoon?" },
      { from: "client", text: "Morning, around 10am" },
      { from: "ai", text: "Done! I booked tomorrow at 10am and I'll send you the reminder. Anything else I can help with?" },
      { from: "client", text: "Perfect, thank you!" },
    ],
  },
  steps: {
    title: "Get started in 3 steps",
    items: [
      { t: "Create your account", d: "14-day free trial, no card required." },
      { t: "Connect WhatsApp and Instagram", d: "Centralize every conversation in minutes." },
      { t: "Sell on autopilot", d: "Let the AI reply, qualify and organize your pipeline." },
    ],
  },
  integrationsLabel: "Connects with the tools you already use",
  plans: {
    title: "Plans that fit your business",
    subtitle: "Per user/month. Cancel anytime. 14 days free on any plan.",
    monthly: "Monthly", annual: "Annual", save: "save 20%", popular: "Most popular",
    perUserMonth: "/user/month", billedYear: "billed R$ {v}/year per user", startFree: "Start free",
    securePay: "Secure payment via Mercado Pago (card or Pix). Auto-renewal, cancel anytime.",
    compareTitle: "Compare plans in detail", featureCol: "Feature",
    items: {
      starter: ["2 users", "1,000 contacts", "WhatsApp + Instagram", "Pipeline and tasks", "5 automations"],
      pro: ["10 users", "10,000 contacts", "Bulk campaigns", "AI copilot + lead scoring", "50 automations", "Service queues"],
      business: ["Unlimited users", "100,000 contacts", "Everything in Pro", "Unlimited automations", "Priority support"],
    },
    rows: [
      { label: "Users", values: ["2", "10", "Unlimited"] },
      { label: "Contacts", values: ["1,000", "10,000", "100,000"] },
      { label: "WhatsApp + Instagram", values: [true, true, true] },
      { label: "Sales pipeline + tasks", values: [true, true, true] },
      { label: "Automations / chatbot", values: ["5", "50", "Unlimited"] },
      { label: "AI: copilot, summary and lead scoring", values: [false, true, true] },
      { label: "Automatic AI reply (24/7)", values: [false, true, true] },
      { label: "Bulk campaigns", values: [false, true, true] },
      { label: "Service queues", values: [false, true, true] },
      { label: "Manager dashboard + BI", values: [true, true, true] },
      { label: "Push notifications", values: [true, true, true] },
      { label: "Priority support", values: [false, false, true] },
    ],
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      { q: "Do I need a card to try?", a: "No. You create the account and use it free for 14 days. You only pay if you decide to continue." },
      { q: "Does it work with the official WhatsApp?", a: "Yes. Solutions integrates with the official WhatsApp API (Meta) and with Instagram Direct." },
      { q: "Does the AI really reply on its own?", a: "Yes. With the AI agent on, it reads the history and replies to the customer instantly, 24/7, and you can take over the chat whenever you want." },
      { q: "Can I use it on mobile?", a: "Yes. It's an installable app (PWA): add it to your home screen and use it like an app, with push notifications." },
      { q: "Can I cancel anytime?", a: "Yes, no penalty. The subscription is monthly and cancellation is immediate from the dashboard." },
      { q: "Can I use it with my own brand?", a: "Yes. Solutions is white-label: add your logo, colors and name — ideal to resell the system as if it were yours." },
    ],
  },
  cta: { title: "Ready to sell more with less effort?", subtitle: "Start now. In 5 minutes you're serving your customers with AI.", button: "Create my free account" },
  footer: { rights: "All rights reserved." },
};

const es: LandingContent = {
  nav: { features: "Recursos", ai: "IA en vivo", plans: "Precios", faq: "Preguntas", login: "Entrar", tryFree: "Prueba gratis" },
  hero: {
    badge: "CRM conversacional con Inteligencia Artificial",
    title1: "Convierte conversaciones", title2: "en ventas en automático",
    subtitle: "WhatsApp e Instagram en un solo lugar, un embudo visual y una IA que responde sola, califica leads y cierra más negocios. Todo en Solutions.",
    cta: "Comenzar prueba gratis de 14 días", haveAccount: "Ya tengo cuenta", noCard: "Sin tarjeta para probar",
  },
  stats: { aiDaily: "IA atendiendo, todos los días", channels: "canales en un solo lugar", freeDays: "gratis para probar", daysSuffix: " días", setup: "para configurar", toTest: "gratis para probar" },
  features: {
    title: "Todo lo que tu equipo necesita para vender más",
    subtitle: 'Del primer "hola" al pago, en una sola plataforma.',
    cards: [
      { title: "Bandeja omnicanal", desc: "WhatsApp e Instagram en una sola bandeja, con colas y asignación por vendedor." },
      { title: "Agente de IA autónomo", desc: "Recibe, califica y responde solo 24/7, y pasa la conversación a un humano en el momento justo." },
      { title: "Copiloto de IA", desc: "Sugiere respuestas, resume conversaciones y puntúa leads (caliente/tibio/frío) con explicación." },
      { title: "Embudo visual", desc: "Arrastra y suelta negocios entre etapas, con motivos de pérdida y dueño de cada negocio." },
      { title: "Automatizaciones", desc: "Crea flujos que responden, etiquetan y crean tareas automáticamente." },
      { title: "Campañas masivas", desc: "Envía mensajes segmentados por etiqueta y sigue las entregas." },
      { title: "BI y panel del gerente", desc: "Ingresos, tasa de cierre, desempeño del equipo y motivos de pérdida en tiempo real." },
      { title: "Equipo y roles", desc: "CEO, socio, gerente, vendedor y visualización, cada uno con el acceso correcto." },
      { title: "Seguro y en la nube", desc: "Datos aislados por empresa, contraseña fuerte y disponible desde cualquier lugar." },
    ],
  },
  ai: {
    badge: "Inteligencia Artificial",
    title: "Tu IA atiende, califica y vende sola",
    subtitle: "Mientras cuidas tu negocio, el agente de IA responde a los clientes al instante, entiende lo que necesitan y solo te llama cuando el lead se calienta. Mira al lado una conversación real en automático.",
    bullets: ["Responde 24 horas al día, 7 días a la semana", "Puntúa cada lead (caliente, tibio, frío) automáticamente", "Pasa a un agente humano en el momento justo"],
    cta: "Quiero la IA atendiendo por mí",
    demoTitle: "Atención Solutions", demoStatus: "IA respondiendo • en línea", demoFooter: "Respuesta generada automáticamente por la IA",
    chat: [
      { from: "client", text: "¡Hola! ¿Tienen un horario para mañana? 😊" },
      { from: "ai", text: "¡Hola! Sí, claro 👋 ¿Prefieres por la mañana o por la tarde?" },
      { from: "client", text: "Por la mañana, sobre las 10h" },
      { from: "ai", text: "¡Listo! Reservé mañana a las 10h y te envío el recordatorio. ¿Te ayudo con algo más?" },
      { from: "client", text: "¡Perfecto, gracias!" },
    ],
  },
  steps: {
    title: "Empieza en 3 pasos",
    items: [
      { t: "Crea tu cuenta", d: "Prueba gratis por 14 días, sin tarjeta." },
      { t: "Conecta WhatsApp e Instagram", d: "Centraliza todas las conversaciones en minutos." },
      { t: "Vende en automático", d: "Deja que la IA responda, califique y organice tu embudo." },
    ],
  },
  integrationsLabel: "Se conecta con las herramientas que ya usas",
  plans: {
    title: "Planes que se adaptan a tu negocio",
    subtitle: "Por usuario/mes. Cancela cuando quieras. 14 días gratis en cualquier plan.",
    monthly: "Mensual", annual: "Anual", save: "ahorra 20%", popular: "Más popular",
    perUserMonth: "/usuario/mes", billedYear: "facturado R$ {v}/año por usuario", startFree: "Comenzar gratis",
    securePay: "Pago seguro vía Mercado Pago (tarjeta o Pix). Renovación automática, cancela cuando quieras.",
    compareTitle: "Compara los planes en detalle", featureCol: "Recurso",
    items: {
      starter: ["2 usuarios", "1.000 contactos", "WhatsApp + Instagram", "Embudo y tareas", "5 automatizaciones"],
      pro: ["10 usuarios", "10.000 contactos", "Campañas masivas", "Copiloto de IA + lead scoring", "50 automatizaciones", "Colas de atención"],
      business: ["Usuarios ilimitados", "100.000 contactos", "Todo lo de Pro", "Automatizaciones ilimitadas", "Soporte prioritario"],
    },
    rows: [
      { label: "Usuarios", values: ["2", "10", "Ilimitados"] },
      { label: "Contactos", values: ["1.000", "10.000", "100.000"] },
      { label: "WhatsApp + Instagram", values: [true, true, true] },
      { label: "Embudo de ventas + tareas", values: [true, true, true] },
      { label: "Automatizaciones / chatbot", values: ["5", "50", "Ilimitadas"] },
      { label: "IA: copiloto, resumen y lead scoring", values: [false, true, true] },
      { label: "Respuesta automática con IA (24/7)", values: [false, true, true] },
      { label: "Campañas masivas", values: [false, true, true] },
      { label: "Colas de atención", values: [false, true, true] },
      { label: "Panel del gerente + BI", values: [true, true, true] },
      { label: "Notificaciones push", values: [true, true, true] },
      { label: "Soporte prioritario", values: [false, false, true] },
    ],
  },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      { q: "¿Necesito tarjeta para probar?", a: "No. Creas la cuenta y la usas gratis por 14 días. Solo pagas si decides continuar." },
      { q: "¿Funciona con el WhatsApp oficial?", a: "Sí. Solutions se integra con la API oficial de WhatsApp (Meta) y con Instagram Direct." },
      { q: "¿La IA responde sola de verdad?", a: "Sí. Con el agente de IA activado, lee el historial y responde al cliente al instante, 24/7, y puedes tomar la conversación cuando quieras." },
      { q: "¿Puedo usarlo en el celular?", a: "Sí. Es una app instalable (PWA): agrégala a la pantalla de inicio y úsala como una aplicación, con notificaciones push." },
      { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin penalidad. La suscripción es mensual y la cancelación es inmediata desde el panel." },
      { q: "¿Puedo usarlo con mi propia marca?", a: "Sí. Solutions es white-label: pon tu logo, tus colores y tu nombre, ideal para revender el sistema como si fuera tuyo." },
    ],
  },
  cta: { title: "¿Listo para vender más con menos esfuerzo?", subtitle: "Empieza ahora. En 5 minutos estás atendiendo a tus clientes con IA.", button: "Crear mi cuenta gratis" },
  footer: { rights: "Todos los derechos reservados." },
};

export const landing: Record<Lang, LandingContent> = { pt, en, es };

// ─────────────────────────── Conteúdo do Login/Cadastro ───────────────────────────

export interface AuthContent {
  tabLogin: string; tabSignup: string;
  nameLabel: string; namePh: string;
  companyLabel: string; companyPh: string;
  emailLabel: string; emailPh: string;
  passwordLabel: string; newPasswordLabel: string; passwordHint: string;
  codeLabel: string; codePh: string;
  loginBtn: string; signupBtn: string; sendCodeBtn: string; resetBtn: string; loading: string;
  forgotTitle: string; resetTitle: string; forgotLink: string;
  forgotPara: string; resetPara: string;
  backToLogin: string; resendCode: string; backToSite: string;
  infoCodeSent: string; infoReset: string;
  err: Record<string, string>; errDefault: string;
}

export const auth: Record<Lang, AuthContent> = {
  pt: {
    tabLogin: "Entrar", tabSignup: "Criar conta",
    nameLabel: "Nome", namePh: "Seu nome",
    companyLabel: "Empresa / Organização", companyPh: "Nome da empresa",
    emailLabel: "E-mail", emailPh: "voce@empresa.com",
    passwordLabel: "Senha", newPasswordLabel: "Nova senha", passwordHint: "Mínimo 8 caracteres, com letras e números.",
    codeLabel: "Código de 6 dígitos", codePh: "000000",
    loginBtn: "Entrar", signupBtn: "Criar conta", sendCodeBtn: "Enviar código", resetBtn: "Redefinir senha", loading: "Aguarde…",
    forgotTitle: "Recuperar senha", resetTitle: "Redefinir senha", forgotLink: "Esqueci minha senha",
    forgotPara: "Digite o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.",
    resetPara: "Cole o código que chegou no seu e-mail e escolha uma nova senha.",
    backToLogin: "← Voltar ao login", resendCode: "Reenviar código", backToSite: "← Voltar ao site",
    infoCodeSent: "Se este e-mail tiver conta, enviamos um código de 6 dígitos. Confira sua caixa de entrada (e o spam).",
    infoReset: "Senha redefinida! Agora é só entrar com a nova senha. ✅",
    err: {
      bad_credentials: "E-mail ou senha incorretos",
      email_in_use: "Este e-mail já está cadastrado",
      no_org: "Sua conta não está vinculada a nenhuma empresa",
      invalid_body: "Confira os dados e tente novamente",
      invalid_code: "Código inválido. Confira e tente de novo",
      code_expired: "Código expirado. Peça um novo",
      missing_token: "Sessão expirada. Entre novamente",
      invalid_token: "Sessão expirada. Entre novamente",
    },
    errDefault: "Não foi possível concluir. Tente novamente",
  },
  en: {
    tabLogin: "Log in", tabSignup: "Create account",
    nameLabel: "Name", namePh: "Your name",
    companyLabel: "Company / Organization", companyPh: "Company name",
    emailLabel: "Email", emailPh: "you@company.com",
    passwordLabel: "Password", newPasswordLabel: "New password", passwordHint: "At least 8 characters, with letters and numbers.",
    codeLabel: "6-digit code", codePh: "000000",
    loginBtn: "Log in", signupBtn: "Create account", sendCodeBtn: "Send code", resetBtn: "Reset password", loading: "Please wait…",
    forgotTitle: "Reset password", resetTitle: "Reset password", forgotLink: "I forgot my password",
    forgotPara: "Enter your account email. We'll send you a code to create a new password.",
    resetPara: "Paste the code that arrived in your email and choose a new password.",
    backToLogin: "← Back to login", resendCode: "Resend code", backToSite: "← Back to site",
    infoCodeSent: "If this email has an account, we sent a 6-digit code. Check your inbox (and spam).",
    infoReset: "Password reset! Now just log in with your new password. ✅",
    err: {
      bad_credentials: "Incorrect email or password",
      email_in_use: "This email is already registered",
      no_org: "Your account isn't linked to any company",
      invalid_body: "Check the data and try again",
      invalid_code: "Invalid code. Check it and try again",
      code_expired: "Code expired. Request a new one",
      missing_token: "Session expired. Log in again",
      invalid_token: "Session expired. Log in again",
    },
    errDefault: "Couldn't complete. Please try again",
  },
  es: {
    tabLogin: "Entrar", tabSignup: "Crear cuenta",
    nameLabel: "Nombre", namePh: "Tu nombre",
    companyLabel: "Empresa / Organización", companyPh: "Nombre de la empresa",
    emailLabel: "Correo electrónico", emailPh: "tu@empresa.com",
    passwordLabel: "Contraseña", newPasswordLabel: "Nueva contraseña", passwordHint: "Mínimo 8 caracteres, con letras y números.",
    codeLabel: "Código de 6 dígitos", codePh: "000000",
    loginBtn: "Entrar", signupBtn: "Crear cuenta", sendCodeBtn: "Enviar código", resetBtn: "Restablecer contraseña", loading: "Espera…",
    forgotTitle: "Recuperar contraseña", resetTitle: "Restablecer contraseña", forgotLink: "Olvidé mi contraseña",
    forgotPara: "Ingresa el correo de tu cuenta. Te enviaremos un código para crear una nueva contraseña.",
    resetPara: "Pega el código que llegó a tu correo y elige una nueva contraseña.",
    backToLogin: "← Volver al inicio de sesión", resendCode: "Reenviar código", backToSite: "← Volver al sitio",
    infoCodeSent: "Si este correo tiene cuenta, enviamos un código de 6 dígitos. Revisa tu bandeja de entrada (y el spam).",
    infoReset: "¡Contraseña restablecida! Ahora solo entra con tu nueva contraseña. ✅",
    err: {
      bad_credentials: "Correo o contraseña incorrectos",
      email_in_use: "Este correo ya está registrado",
      no_org: "Tu cuenta no está vinculada a ninguna empresa",
      invalid_body: "Revisa los datos e inténtalo de nuevo",
      invalid_code: "Código inválido. Revísalo e inténtalo de nuevo",
      code_expired: "Código expirado. Solicita uno nuevo",
      missing_token: "Sesión expirada. Entra de nuevo",
      invalid_token: "Sesión expirada. Entra de nuevo",
    },
    errDefault: "No se pudo completar. Inténtalo de nuevo",
  },
};
