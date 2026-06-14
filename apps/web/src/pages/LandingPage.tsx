import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquare, KanbanSquare, Zap, Sparkles, LineChart, Users, Megaphone, Bell,
  Check, Phone, Instagram, ChevronDown, ShieldCheck,
} from "lucide-react";

/** Hero tecnológico: rede de partículas conectadas animada em <canvas> (estilo Kusama). */
function TechHero() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const ctx0 = canvasEl.getContext("2d");
    if (!ctx0) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctx0;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type P = { x: number; y: number; vx: number; vy: number };
    let pts: P[] = [];

    function resize() {
      const parent = canvas.parentElement!;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 16000));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    }
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#38bdf8", "#22d3ee", "#34d399", "#f59e0b"];
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      // linhas entre partículas próximas
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(56,189,248,${(1 - dist / 130) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nós
      pts.forEach((p, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10">
      <div className="mb-3 inline-flex rounded-xl bg-white/10 p-2">{icon}</div>
      <div className="font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{desc}</div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)} className="block w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-white">{q}</span>
        <ChevronDown className={`h-4 w-4 text-slate-300 transition ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <div className="mt-2 text-sm text-slate-300">{a}</div>}
    </button>
  );
}

interface Props {
  onEnter: () => void;
  onSignup: () => void;
}

export default function LandingPage({ onEnter, onSignup }: Props) {
  const plans = [
    { name: "Starter", price: 49, featured: false, items: ["2 usuários", "1.000 contatos", "WhatsApp + Instagram", "Funil e tarefas", "5 automações"] },
    { name: "Pro", price: 99, featured: true, items: ["10 usuários", "10.000 contatos", "Campanhas em massa", "IA copiloto + lead scoring", "50 automações", "Filas de atendimento"] },
    { name: "Business", price: 197, featured: false, items: ["Usuários ilimitados", "100.000 contatos", "Tudo do Pro", "Automações ilimitadas", "Suporte prioritário"] },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Solutions" className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-lg font-semibold">Solutions</span>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#faq" className="hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={onEnter} className="rounded-2xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Entrar</button>
            <button onClick={onSignup} className="rounded-2xl bg-sky-500 px-3 py-2 text-sm font-medium hover:bg-sky-400">Teste grátis</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <TechHero />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/50 to-slate-950" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center">
          <img src="/logo.jpeg" alt="Solutions" className="mx-auto mb-6 h-20 w-20 rounded-3xl object-cover ring-2 ring-white/20" />
          <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-sky-300">
            <Sparkles className="h-3.5 w-3.5" /> CRM conversacional com Inteligência Artificial
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Transforme conversas<br />em <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">vendas no automático</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            WhatsApp e Instagram em um só lugar, funil visual, automações com IA que respondem sozinhas e fecham mais negócios. Tudo no Solutions.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onSignup} className="rounded-2xl bg-sky-500 px-6 py-3 font-medium hover:bg-sky-400">Começar teste grátis de 14 dias</button>
            <button onClick={onEnter} className="rounded-2xl border border-white/20 px-6 py-3 font-medium hover:bg-white/10">Já tenho conta</button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> Sem cartão para testar</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> WhatsApp</span>
            <span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram</span>
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Tudo que sua equipe precisa para vender mais</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">Do primeiro "oi" ao pagamento, em uma plataforma só.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <FeatureCard icon={<MessageSquare className="h-5 w-5 text-sky-400" />} title="Inbox omnichannel" desc="WhatsApp e Instagram numa caixa única, com filas e atribuição por vendedor." />
          <FeatureCard icon={<Sparkles className="h-5 w-5 text-violet-400" />} title="Copiloto de IA" desc="Sugere respostas, resume conversas e pontua leads (quente/morno/frio) com explicação." />
          <FeatureCard icon={<Zap className="h-5 w-5 text-amber-400" />} title="Robô que responde sozinho" desc="Automações e chatbot com IA respondem 24/7 e qualificam leads enquanto você dorme." />
          <FeatureCard icon={<KanbanSquare className="h-5 w-5 text-emerald-400" />} title="Funil visual" desc="Arraste e solte negócios entre etapas, com motivos de perda e dono de cada deal." />
          <FeatureCard icon={<Megaphone className="h-5 w-5 text-orange-400" />} title="Campanhas em massa" desc="Dispare mensagens segmentadas por tag e acompanhe entregas." />
          <FeatureCard icon={<LineChart className="h-5 w-5 text-sky-400" />} title="BI e painel do gestor" desc="Receita, taxa de ganho, desempenho do time e motivos de perda em tempo real." />
          <FeatureCard icon={<Users className="h-5 w-5 text-blue-400" />} title="Equipe e papéis" desc="CEO, sócio, gestor, vendedor e visualização — cada um com o acesso certo." />
          <FeatureCard icon={<Bell className="h-5 w-5 text-rose-400" />} title="Notificações push" desc="Avisos no celular quando chega lead ou mensagem, mesmo com o app fechado." />
          <FeatureCard icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />} title="Seguro e na nuvem" desc="Dados isolados por empresa, senha forte, e disponível de qualquer lugar." />
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-y border-white/10 bg-white/5 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Comece em 3 passos</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Crie sua conta", d: "Teste grátis por 14 dias, sem cartão." },
              { n: "2", t: "Conecte WhatsApp e Instagram", d: "Centralize todas as conversas em minutos." },
              { n: "3", t: "Venda no automático", d: "Deixe a IA responder, qualificar e organizar seu funil." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 font-bold">{s.n}</div>
                <div className="font-semibold">{s.t}</div>
                <div className="mt-1 text-sm text-slate-300">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Planos que cabem no seu negócio</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">Por usuário/mês. Cancele quando quiser. 14 dias grátis em qualquer plano.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl border p-6 ${p.featured ? "border-sky-400 bg-white/10 ring-1 ring-sky-400" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{p.name}</div>
                {p.featured && <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs">Mais popular</span>}
              </div>
              <div className="mt-3 text-3xl font-bold">R$ {p.price}<span className="text-sm font-normal text-slate-400">/usuário/mês</span></div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {it}</li>
                ))}
              </ul>
              <button onClick={onSignup} className={`mt-6 w-full rounded-2xl py-2.5 font-medium ${p.featured ? "bg-sky-500 hover:bg-sky-400" : "border border-white/20 hover:bg-white/10"}`}>
                Começar grátis
              </button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Pagamento seguro via Mercado Pago (cartão ou Pix). Renovação automática, cancele a qualquer momento.</p>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          <Faq q="Preciso de cartão para testar?" a="Não. Você cria a conta e usa por 14 dias grátis. Só paga se decidir continuar." />
          <Faq q="Funciona com WhatsApp oficial?" a="Sim. O Solutions integra com a API oficial do WhatsApp (Meta) e com o Instagram Direct." />
          <Faq q="A IA responde sozinha de verdade?" a="Sim. Com a auto-resposta ativada, a IA lê o histórico e responde o cliente na hora, 24/7 — e você pode assumir a conversa quando quiser." />
          <Faq q="Consigo usar no celular?" a="Sim. É um app instalável (PWA): adicione à tela inicial e use como um aplicativo, com notificações push." />
          <Faq q="Posso cancelar quando quiser?" a="Sim, sem multa. A assinatura é mensal e o cancelamento é imediato pelo painel." />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-white/10 bg-gradient-to-b from-slate-950 to-slate-900 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Pronto para vender mais com menos esforço?</h2>
          <p className="mt-3 text-slate-300">Comece agora — em 5 minutos você está atendendo seus clientes com IA.</p>
          <button onClick={onSignup} className="mt-6 rounded-2xl bg-sky-500 px-8 py-3 font-medium hover:bg-sky-400">Criar minha conta grátis</button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.jpeg" alt="Solutions" className="h-6 w-6 rounded-lg object-cover" />
          <span className="font-medium text-slate-200">Solutions CRM</span>
        </div>
        <div className="mt-2">© {new Date().getFullYear()} Solutions. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
