import React, { useEffect, useRef, useState } from "react";
import { Video, Calendar, Trash2, LogOut } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { getUser } from "../lib/auth";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  createdByName: string;
}

function loadJitsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const s = document.createElement("script");
    s.src = "https://meet.jit.si/external_api.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("jitsi_load_failed"));
    document.body.appendChild(s);
  });
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function ReunioesView({ token, isManager }: { token: string; isManager: boolean }) {
  const user = getUser();
  const roomName = `solutionscrm-${(user?.orgId ?? "sala").replace(/[^a-zA-Z0-9]/g, "")}`;
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [inCall, setInCall] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [err, setErr] = useState("");
  const jitsiRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  async function load() {
    try {
      setMeetings(await apiGet("/meetings", token));
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!inCall) return;
    let disposed = false;
    setErr("");
    loadJitsi()
      .then(() => {
        if (disposed || !jitsiRef.current || !window.JitsiMeetExternalAPI) return;
        apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName,
          parentNode: jitsiRef.current,
          width: "100%",
          height: 600,
          userInfo: { displayName: user?.name ?? "Participante" },
          configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true },
        });
        apiRef.current.addEventListener("readyToClose", () => setInCall(false));
      })
      .catch(() => {
        setErr("Não foi possível carregar a sala de vídeo. Verifique sua conexão e tente de novo.");
        setInCall(false);
      });
    return () => {
      disposed = true;
      try {
        apiRef.current?.dispose();
      } catch {
        /* ignore */
      }
      apiRef.current = null;
    };
  }, [inCall, roomName]); // eslint-disable-line react-hooks/exhaustive-deps

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !when) return;
    try {
      await apiPost("/meetings", { title: title.trim(), scheduledAt: new Date(when).toISOString() }, token);
      setTitle("");
      setWhen("");
      load();
    } catch {
      /* ignore */
    }
  }
  async function cancel(id: string) {
    if (!confirm("Cancelar esta reunião?")) return;
    try {
      await apiDelete(`/meetings/${id}`, token);
      load();
    } catch {
      /* ignore */
    }
  }

  if (inCall) {
    return (
      <div className="space-y-3 p-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Sala de reunião</h1>
          <button onClick={() => setInCall(false)} className="flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            <LogOut className="h-4 w-4" /> Sair da reunião
          </button>
        </div>
        <div ref={jitsiRef} className="overflow-hidden rounded-2xl border bg-black" style={{ minHeight: 600 }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white"><Video className="h-4 w-4" /></span> Reuniões por vídeo</h1>
        <p className="mt-1 text-sm text-slate-500">Sua sala de vídeo da empresa, dentro do app. Agende um horário e a equipe entra com 1 clique.</p>
      </div>

      <div className="rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Video className="h-5 w-5 text-sky-400" /> Sala da sua equipe
        </div>
        <p className="mt-1 text-sm text-slate-300">Todos da empresa entram na mesma sala. Áudio e vídeo no navegador, sem instalar nada.</p>
        <button onClick={() => setInCall(true)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400">
          <Video className="h-4 w-4" /> Entrar na reunião agora
        </button>
        {err && <div className="mt-3 text-sm text-red-300">{err}</div>}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium text-slate-600">
          <Calendar className="h-4 w-4" /> Próximas reuniões
        </div>
        <div className="divide-y">
          {meetings.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">Nenhuma reunião agendada.</div>}
          {meetings.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">{m.title}</div>
                <div className="text-xs text-slate-500">{fmt(m.scheduledAt)} · agendou: {m.createdByName}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setInCall(true)} className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400">Entrar</button>
                {isManager && (
                  <button onClick={() => cancel(m.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Cancelar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isManager && (
        <form onSubmit={schedule} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium text-slate-600">Agendar reunião</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Alinhamento de metas da semana" className="rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200" />
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200" />
            <button type="submit" disabled={!title.trim() || !when} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">Agendar</button>
          </div>
        </form>
      )}
    </div>
  );
}
