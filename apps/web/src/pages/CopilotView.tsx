import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Send, AlertCircle } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import Foxy from "../components/Foxy";

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
      <div className="flex items-center gap-3 p-4 pb-3 border-b">
        <Foxy size={46} className="shrink-0" />
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-violet-500" /> Foxy · Copiloto de Vendas
          </div>
          <div className="text-sm text-slate-500">Powered by Claude. Peça mensagens, estratégias, respostas a objeções e mais.</div>
        </div>
      </div>

      {enabled === false && (
        <div className="m-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>A IA ainda não está ativada. Adicione a variável <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> no servidor (Render → solutions-api → Environment) para ligar o copiloto.</span>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-auto p-4" style={{ minHeight: 360, maxHeight: 480 }}>
        {chat.length === 0 && (
          <div className="space-y-3">
            <div className="flex flex-col items-center py-2 text-center">
              <Foxy size={112} float />
              <div className="mt-2 max-w-sm text-sm text-slate-600">
                Oi! Eu sou a <strong>Foxy</strong> 🦊, sua copilota de vendas. Me pergunte qualquer coisa — eu te ajudo a vender mais.
              </div>
            </div>
            <div className="text-sm text-slate-500">Comece com uma sugestão:</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sugestoes.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-2xl border p-3 text-left text-sm hover:bg-slate-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && <Foxy size={30} className="mt-0.5 shrink-0" />}
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl border px-3 py-2 text-sm ${m.role === "user" ? "bg-slate-900 text-white" : "bg-white"}`}>
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
