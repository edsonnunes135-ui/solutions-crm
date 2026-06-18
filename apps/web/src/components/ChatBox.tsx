import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";

export interface ChatMsg {
  id: string;
  fromUserId: string;
  fromName: string;
  fromRole: string;
  body: string;
  createdAt: string;
}

const roleTag: Record<string, string> = { owner: "Gestor", partner: "Sócio", admin: "Gerente", agent: "Vendedor", viewer: "Visualização", ceo: "CEO" };
const hhmm = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Caixa de chat reutilizável (equipe, suporte do gestor e suporte do CEO). */
export default function ChatBox({
  token,
  loadPath,
  sendPath,
  meId,
  placeholder = "Escreva uma mensagem…",
  emptyHint = "Nenhuma mensagem ainda. Comece a conversa!",
  heightClass = "h-[460px]",
}: {
  token: string;
  loadPath: string;
  sendPath: string;
  meId: string;
  placeholder?: string;
  emptyHint?: string;
  heightClass?: string;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const m = await apiGet(loadPath, token);
      setMsgs(Array.isArray(m) ? m : []);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // tempo real por polling (5s)
    return () => clearInterval(t);
  }, [loadPath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await apiPost(sendPath, { body }, token);
      await load();
    } catch {
      setText(body); // devolve o texto se falhar
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border bg-white">
      <div className={`${heightClass} space-y-3 overflow-y-auto p-4`}>
        {msgs.length === 0 && <div className="grid h-full place-items-center text-sm text-slate-400">{emptyHint}</div>}
        {msgs.map((m) => {
          const mine = m.fromUserId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-slate-900 text-white" : "border bg-slate-50 text-slate-800"}`}>
                {!mine && (
                  <div className="mb-0.5 text-xs font-medium text-slate-500">
                    {m.fromName} {m.fromRole && <span className="text-slate-400">· {roleTag[m.fromRole] ?? m.fromRole}</span>}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`mt-0.5 text-[10px] ${mine ? "text-slate-300" : "text-slate-400"}`}>{hhmm(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button type="submit" disabled={sending || !text.trim()} className="rounded-2xl bg-slate-900 p-2.5 text-white hover:bg-slate-800 disabled:opacity-50" title="Enviar">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
