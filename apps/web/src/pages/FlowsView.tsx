import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { MessageSquare, HelpCircle, Zap, Plus, Trash2, ArrowUp, ArrowDown, Bot, Pencil } from "lucide-react";

/** Bloco de um fluxo. */
type Step = {
  type: "message" | "ask" | "action";
  text?: string;
  saveAs?: string;
  action?: "tag" | "task" | "stage" | "handoff";
  value?: string;
};
type Flow = { id: string; name: string; active: boolean; triggers: string[]; steps: Step[] };

const ACTION_LABELS: Record<string, string> = {
  tag: "Etiquetar contato",
  task: "Criar tarefa",
  stage: "Mover no funil",
  handoff: "Passar para humano",
};

const STEP_META = {
  message: { icon: <MessageSquare className="h-4 w-4 text-sky-500" />, label: "Mensagem" },
  ask: { icon: <HelpCircle className="h-4 w-4 text-violet-500" />, label: "Pergunta" },
  action: { icon: <Zap className="h-4 w-4 text-amber-500" />, label: "Ação" },
};

export default function FlowsView({ token }: { token: string }) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [editing, setEditing] = useState<Flow | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await apiGet("/flows", token).catch(() => []);
    setFlows(Array.isArray(list) ? list : []);
  }
  useEffect(() => { load(); }, [token]);

  function newFlow() {
    setEditing({ id: "", name: "Novo fluxo", active: true, triggers: [], steps: [{ type: "message", text: "" }] });
  }

  async function save() {
    if (!editing || busy) return;
    setBusy(true);
    const body = { name: editing.name, active: editing.active, triggers: editing.triggers, steps: editing.steps };
    try {
      if (editing.id) await apiPut(`/flows/${editing.id}`, body, token);
      else await apiPost("/flows", body, token);
      setEditing(null);
      await load();
    } catch {
      alert("Não foi possível salvar o fluxo. Confira os campos e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFlow(id: string) {
    if (!confirm("Excluir este fluxo?")) return;
    await apiDelete(`/flows/${id}`, token);
    await load();
  }

  // ── edição de blocos ──
  function patchStep(i: number, patch: Partial<Step>) {
    if (!editing) return;
    const steps = editing.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setEditing({ ...editing, steps });
  }
  function addStep(type: Step["type"]) {
    if (!editing) return;
    const base: Step = type === "action" ? { type, action: "tag", value: "" } : { type, text: "" };
    setEditing({ ...editing, steps: [...editing.steps, base] });
  }
  function moveStep(i: number, dir: -1 | 1) {
    if (!editing) return;
    const j = i + dir;
    if (j < 0 || j >= editing.steps.length) return;
    const steps = [...editing.steps];
    [steps[i], steps[j]] = [steps[j], steps[i]];
    setEditing({ ...editing, steps });
  }
  function removeStep(i: number) {
    if (!editing) return;
    setEditing({ ...editing, steps: editing.steps.filter((_, idx) => idx !== i) });
  }

  // ─────────────────────────────── EDITOR ───────────────────────────────
  if (editing) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-sky-500" />
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="rounded-xl border px-3 py-1.5 text-lg font-semibold outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(null)} className="rounded-xl border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={save} disabled={busy} className="rounded-xl bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50">{busy ? "Salvando…" : "Salvar fluxo"}</button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-3">
          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            Fluxo ativo
          </label>
          <div className="mt-2 text-sm font-medium text-slate-700">Gatilhos (quando ativar)</div>
          <div className="text-xs text-slate-500">Palavras ou frases que ligam o fluxo. Separe por vírgula. Deixe vazio para o fluxo de boas-vindas.</div>
          <input
            value={editing.triggers.join(", ")}
            onChange={(e) => setEditing({ ...editing, triggers: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="preço, valor, quanto custa"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        {/* Blocos */}
        <div className="space-y-2">
          {editing.steps.map((s, i) => (
            <div key={i} className="rounded-2xl border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  {STEP_META[s.type].icon} {i + 1}. {STEP_META[s.type].label}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveStep(i, -1)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" title="Subir"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => moveStep(i, 1)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" title="Descer"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => removeStep(i)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remover"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {(s.type === "message" || s.type === "ask") && (
                <textarea
                  value={s.text ?? ""}
                  onChange={(e) => patchStep(i, { text: e.target.value })}
                  placeholder={s.type === "ask" ? "O que a IA pergunta ao cliente?" : "O que a IA responde?"}
                  rows={2}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              )}
              {s.type === "ask" && (
                <input
                  value={s.saveAs ?? ""}
                  onChange={(e) => patchStep(i, { saveAs: e.target.value })}
                  placeholder="Guardar a resposta como… (ex.: nome, email)"
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
              )}
              {s.type === "action" && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={s.action ?? "tag"}
                    onChange={(e) => patchStep(i, { action: e.target.value as Step["action"] })}
                    className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {s.action !== "handoff" && (
                    <input
                      value={s.value ?? ""}
                      onChange={(e) => patchStep(i, { value: e.target.value })}
                      placeholder={s.action === "tag" ? "nome da etiqueta" : s.action === "stage" ? "nome da etapa" : "título da tarefa"}
                      className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Adicionar bloco */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Adicionar bloco:</span>
          <button onClick={() => addStep("message")} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"><MessageSquare className="h-4 w-4 text-sky-500" /> Mensagem</button>
          <button onClick={() => addStep("ask")} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"><HelpCircle className="h-4 w-4 text-violet-500" /> Pergunta</button>
          <button onClick={() => addStep("action")} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"><Zap className="h-4 w-4 text-amber-500" /> Ação</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────── LISTA ───────────────────────────────
  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><Bot className="h-5 w-5 text-sky-500" /> Fluxos da IA</h1>
          <p className="mt-1 text-sm text-slate-500">Monte o atendimento automático arrastando blocos: gatilho, mensagens, perguntas e ações. Sem código.</p>
        </div>
        <button onClick={newFlow} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"><Plus className="h-4 w-4" /> Novo fluxo</button>
      </div>

      {flows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">
          Você ainda não tem fluxos. Crie o primeiro e deixe a IA atender no automático. 🤖
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {flows.map((f) => (
            <div key={f.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    {f.name}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${f.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{f.active ? "ativo" : "pausado"}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {f.steps?.length ?? 0} bloco(s) · {f.triggers?.length ? `gatilhos: ${f.triggers.join(", ")}` : "fluxo de boas-vindas"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="Editar"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => removeFlow(f.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border bg-sky-50/50 p-3 text-xs text-slate-500">
        💡 Os fluxos rodam sozinhos: quando o cliente manda uma palavra-gatilho no WhatsApp ou Instagram, o fluxo responde na hora (não precisa da chave da IA). Deixe os gatilhos vazios para um fluxo de boas-vindas na primeira mensagem do cliente.
      </div>
    </div>
  );
}
