import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Send, AlertCircle } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}

const sugestoes = [
  "Como respondo um cliente que achou caro?",
  "Escreva uma mensagem de follow-up para um lead sumido há 5 dias.",
  "Crie um roteiro de qualificação para novos leads no WhatsApp.",
  "Quais perguntas faço para entender a necessidade do cliente?",
];

export default function CopilotView({ token }: { token: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [chat, setChat] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet("/ai/status", token).then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, [token]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, loading]);

  async function ask(prompt: string) {
    if (!prompt.trim() || loading) return;
    setChat((c) => [...c, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);
    try {
      const r = await apiPost("/ai/ask", { prompt }, token);
      setChat((c) => [...c, { role: "ai", text: r.answer }]);
    } catch (err: any) {
      setChat((c) => [...c, { role: "ai", text: `Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col" >
      <div className="p-4 pb-3 border-b">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-5 w-5 text-violet-500" /> Copiloto de Vendas (IA)
        </div>
        <div className="text-sm text-slate-500">Powered by Claude. Peça mensagens, estratégias, respostas a objeções e mais.</div>
      </div>

      {enabled === false && (
        <div className="m-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>A IA ainda não está ativada. Adicione a variável <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> no servidor (Render → solutions-api → Environment) para ligar o copiloto.</span>
        </div>
      )}

      <div className="chat-bg flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4" style={{ minHeight: 360, maxHeight: 480 }}>
        {chat.length === 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-500">Comece com uma sugestão:</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sugestoes.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-2xl border border-slate-200/80 bg-white p-3 text-left text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] min-w-0 whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm [overflow-wrap:anywhere] ${m.role === "user" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400">Pensando…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao copiloto…"
          className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button type="submit" disabled={loading || !input.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          <Send className="h-4 w-4" /> Enviar
        </button>
      </form>
    </Card>
  );
}
