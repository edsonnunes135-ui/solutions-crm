import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquare, KanbanSquare, Zap, Sparkles, LineChart, Users, Megaphone, Bell,
  Check, Phone, Instagram, ChevronDown, ShieldCheck, Bot, CreditCard, Clock, Rocket,
} from "lucide-react";
import { useLang, landing, LanguageSelector } from "../lib/i18n";

/**
 * Fundo tecnológico: rede de partículas conectadas, em TELA CHEIA (fixo atrás
 * de toda a página) e REATIVO AO MOUSE — as linhas/"tracinhos" seguem o cursor.
 */
function TechBackground() {
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
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(190, Math.floor((w * h) / 11000)); // bem mais partículas
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
      }));
    }
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);

    const colors = ["#38bdf8", "#22d3ee", "#34d399", "#a78bfa", "#f59e0b"];
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const mdx = mouse.x - p.x, mdy = mouse.y - p.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 190 && md > 0.01) { p.vx += (mdx / md) * 0.012; p.vy += (mdy / md) * 0.012; } // atração suave ao mouse
        p.vx = Math.max(-0.85, Math.min(0.85, p.vx));
        p.vy = Math.max(-0.85, Math.min(0.85, p.vy));
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 145) {
            ctx.strokeStyle = `rgba(56,189,248,${(1 - d / 145) * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < 180) {
          ctx.strokeStyle = `rgba(167,139,250,${(1 - dm / 180) * 0.55})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      pts.forEach((p, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" />;
}

/** Número que conta de 0 até o alvo quando entra na tela. */
function CountUp({ to, suffix = "", duration = 1300 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((ents) => {
      if (ents[0].isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/** Demo animada: a IA atendendo um cliente sozinha (loop). */
function AIChatDemo({ title, status, footer, script }: { title: string; status: string; footer: string; script: { from: "client" | "ai"; text: string }[] }) {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c >= script.length ? 1 : c + 1)), 1900);
    return () => clearInterval(id);
  }, [script.length]);

  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-white/15 bg-slate-900/70 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"><Phone className="h-4 w-4" /></div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-300"><Bot className="h-3 w-3" /> {status}</div>
        </div>
      </div>
      <div className="space-y-2 py-3" style={{ minHeight: 220 }}>
        {script.slice(0, count).map((m, i) => (
          <div key={i} className={`flex ${m.from === "ai" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === "ai" ? "bg-sky-500 text-white" : "bg-white/10 text-slate-100"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
        <Sparkles className="h-3.5 w-3.5 text-sky-300" /> {footer}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:-translate-y-1 hover:border-sky-400/40 hover:bg-white/10">
      <div className="mb-3 inline-flex rounded-xl bg-white/10 p-2">{icon}</div>
      <div className="font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{desc}</div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)} className="block w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur transition hover:bg-white/10">
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
  const { lang } = useLang();
  const L = landing[lang];
  const [annual, setAnnual] = useState(false);

  const featureIcons = [
    <MessageSquare className="h-5 w-5 text-sky-400" />, <Bot className="h-5 w-5 text-violet-400" />,
    <Sparkles className="h-5 w-5 text-fuchsia-400" />, <KanbanSquare className="h-5 w-5 text-emerald-400" />,
    <Zap className="h-5 w-5 text-amber-400" />, <Megaphone className="h-5 w-5 text-orange-400" />,
    <LineChart className="h-5 w-5 text-sky-400" />, <Users className="h-5 w-5 text-blue-400" />,
    <ShieldCheck className="h-5 w-5 text-emerald-400" />,
  ];
  const stepIcons = [<Rocket className="h-5 w-5" />, <Phone className="h-5 w-5" />, <Bot className="h-5 w-5" />];

  const planMeta = [
    { key: "starter" as const, name: "Starter", price: 49, featured: false },
    { key: "pro" as const, name: "Pro", price: 99, featured: true },
    { key: "business" as const, name: "Business", price: 197, featured: false },
  ];
  const priceOf = (base: number) => (annual ? Math.round(base * 0.8) : base);

  const stats = [
    { node: <CountUp to={24} suffix="/7" />, label: L.stats.aiDaily },
    { node: <CountUp to={2} />, label: L.stats.channels },
    { node: <CountUp to={14} suffix={L.stats.daysSuffix} />, label: L.stats.toTest },
    { node: <span>5 min</span>, label: L.stats.setup },
  ];

  const integrations = [
    { icon: <Phone className="h-5 w-5 text-emerald-400" />, name: "WhatsApp" },
    { icon: <Instagram className="h-5 w-5 text-pink-400" />, name: "Instagram" },
    { icon: <Bot className="h-5 w-5 text-sky-400" />, name: "IA Claude" },
    { icon: <CreditCard className="h-5 w-5 text-amber-400" />, name: "Mercado Pago" },
    { icon: <Bell className="h-5 w-5 text-rose-400" />, name: "Push" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      {/* FUNDO ANIMADO EM TELA CHEIA */}
      <TechBackground />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/25 to-slate-950/75" />

      <div className="relative z-10">
        {/* NAV */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="Solutions" className="h-8 w-8 rounded-xl object-cover" />
              <span className="text-lg font-semibold">Solutions</span>
            </div>
            <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
              <a href="#recursos" className="hover:text-white">{L.nav.features}</a>
              <a href="#ia" className="hover:text-white">{L.nav.ai}</a>
              <a href="#planos" className="hover:text-white">{L.nav.plans}</a>
              <a href="#faq" className="hover:text-white">{L.nav.faq}</a>
            </nav>
            <div className="flex items-center gap-2">
              <LanguageSelector variant="dark" />
              <button onClick={onEnter} className="rounded-2xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10">{L.nav.login}</button>
              <button onClick={onSignup} className="rounded-2xl bg-sky-500 px-3 py-2 text-sm font-medium hover:bg-sky-400">{L.nav.tryFree}</button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative mx-auto max-w-4xl px-4 py-24 text-center md:py-28">
          <img src="/logo.jpeg" alt="Solutions" className="mx-auto mb-6 h-20 w-20 rounded-3xl object-cover ring-2 ring-white/20" />
          <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-sky-300 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> {L.hero.badge}
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            {L.hero.title1}<br /><span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">{L.hero.title2}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">{L.hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onSignup} className="rounded-2xl bg-sky-500 px-6 py-3 font-medium shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400">{L.hero.cta}</button>
            <button onClick={onEnter} className="rounded-2xl border border-white/20 px-6 py-3 font-medium hover:bg-white/10">{L.hero.haveAccount}</button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> {L.hero.noCard}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> WhatsApp</span>
            <span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram</span>
          </div>
        </section>

        {/* NÚMEROS ANIMADOS */}
        <section className="mx-auto max-w-5xl px-4 pb-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur">
                <div className="text-3xl font-bold text-sky-300 md:text-4xl">{s.node}</div>
                <div className="mt-1 text-xs text-slate-300">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* RECURSOS */}
        <section id="recursos" className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{L.features.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">{L.features.subtitle}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {L.features.cards.map((c, i) => (
              <FeatureCard key={i} icon={featureIcons[i]} title={c.title} desc={c.desc} />
            ))}
          </div>
        </section>

        {/* IA AO VIVO (demo interativa) */}
        <section id="ia" className="border-y border-white/10 bg-white/5 py-20 backdrop-blur">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-violet-300">
                <Bot className="h-3.5 w-3.5" /> {L.ai.badge}
              </div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">{L.ai.title}</h2>
              <p className="mt-3 text-slate-300">{L.ai.subtitle}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                {L.ai.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {b}</li>
                ))}
              </ul>
              <button onClick={onSignup} className="mt-6 rounded-2xl bg-violet-500 px-6 py-3 font-medium transition hover:-translate-y-0.5 hover:bg-violet-400">{L.ai.cta}</button>
            </div>
            <AIChatDemo title={L.ai.demoTitle} status={L.ai.demoStatus} footer={L.ai.demoFooter} script={L.ai.chat} />
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold md:text-4xl">{L.steps.title}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {L.steps.items.map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur transition hover:bg-white/10">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500">{stepIcons[i]}</div>
                <div className="font-semibold">{s.t}</div>
                <div className="mt-1 text-sm text-slate-300">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* INTEGRAÇÕES */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="mb-5 flex items-center justify-center gap-2 text-sm text-slate-300">
              <Clock className="h-4 w-4 text-sky-300" /> {L.integrationsLabel}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {integrations.map((it) => (
                <div key={it.name} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-sm">
                  {it.icon} <span className="text-slate-200">{it.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{L.plans.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">{L.plans.subtitle}</p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={!annual ? "font-medium text-white" : "text-slate-400"}>{L.plans.monthly}</span>
            <button
              onClick={() => setAnnual((a) => !a)}
              className={`relative h-7 w-14 rounded-full transition ${annual ? "bg-emerald-500" : "bg-slate-600"}`}
              aria-label={L.plans.annual}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${annual ? "left-8" : "left-1"}`} />
            </button>
            <span className={annual ? "font-medium text-white" : "text-slate-400"}>
              {L.plans.annual} <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">{L.plans.save}</span>
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {planMeta.map((p) => (
              <div key={p.name} className={`rounded-2xl border p-6 backdrop-blur transition hover:-translate-y-1 ${p.featured ? "border-sky-400 bg-white/10 ring-1 ring-sky-400" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{p.name}</div>
                  {p.featured && <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs">{L.plans.popular}</span>}
                </div>
                <div className="mt-3 text-3xl font-bold">R$ {priceOf(p.price)}<span className="text-sm font-normal text-slate-400">{L.plans.perUserMonth}</span></div>
                <div className="mt-1 h-4 text-xs text-emerald-300">
                  {annual ? L.plans.billedYear.replace("{v}", String(priceOf(p.price) * 12)) : ""}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  {L.plans.items[p.key].map((it) => (
                    <li key={it} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {it}</li>
                  ))}
                </ul>
                <button onClick={onSignup} className={`mt-6 w-full rounded-2xl py-2.5 font-medium ${p.featured ? "bg-sky-500 hover:bg-sky-400" : "border border-white/20 hover:bg-white/10"}`}>
                  {L.plans.startFree}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">{L.plans.securePay}</p>

          <div className="mt-14">
            <h3 className="mb-4 text-center text-xl font-semibold">{L.plans.compareTitle}</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th className="px-4 py-3 font-medium text-slate-300">{L.plans.featureCol}</th>
                    <th className="px-4 py-3 text-center font-semibold">Starter</th>
                    <th className="px-4 py-3 text-center font-semibold text-sky-300">Pro</th>
                    <th className="px-4 py-3 text-center font-semibold">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {L.plans.rows.map((row) => (
                    <tr key={row.label} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-slate-200">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          {typeof v === "boolean"
                            ? (v ? <Check className="mx-auto h-4 w-4 text-emerald-400" /> : <span className="text-slate-600">✕</span>)
                            : <span className="text-slate-200">{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold md:text-4xl">{L.faq.title}</h2>
          <div className="mt-8 space-y-3">
            {L.faq.items.map((f, i) => (
              <Faq key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-t border-white/10 bg-gradient-to-b from-transparent to-slate-900/70 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{L.cta.title}</h2>
            <p className="mt-3 text-slate-300">{L.cta.subtitle}</p>
            <button onClick={onSignup} className="mt-6 rounded-2xl bg-sky-500 px-8 py-3 font-medium shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400">{L.cta.button}</button>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-400">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.jpeg" alt="Solutions" className="h-6 w-6 rounded-lg object-cover" />
            <span className="font-medium text-slate-200">Solutions CRM</span>
          </div>
          <div className="mt-2">© {new Date().getFullYear()} Solutions. {L.footer.rights}</div>
        </footer>
      </div>
    </div>
  );
}
