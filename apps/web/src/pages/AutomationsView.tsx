import React, { useState } from "react";
import { Zap, Plus, Trash2, X, MessageSquare, ListTodo, Tag as TagIcon } from "lucide-react";
import { apiPost, apiPatch, apiDelete } from "../lib/api";

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}
function Input(props: any) {
  return <input {...props} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 ${props.className ?? ""}`} />;
}

const triggerLabel: Record<string, string> = {
  message_received: "Mensagem recebida",
  stage_changed: "Mudança de etapa no funil",
  inactivity: "Inatividade do lead",
};

interface Props {
  token: string;
  automations: any[];
  onChanged: () => void;
}

export default function AutomationsView({ token, automations, onChanged }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // formulário do fluxo
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("message_received");
  const [keywords, setKeywords] = useState("");
  const [inactivityDays, setInactivityDays] = useState("30");
  const [replyText, setReplyText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [tagName, setTagName] = useState("");

  function resetForm() {
    setName(""); setTrigger("message_received"); setKeywords("");
    setReplyText(""); setTaskTitle(""); setTagName(""); setInactivityDays("30");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const actions: any[] = [];
    if (replyText.trim()) actions.push({ type: "send_message", text: replyText.trim() });
    if (taskTitle.trim()) actions.push({ type: "create_task", title: taskTitle.trim(), priority: "high", dueInHours: 1 });
    if (tagName.trim()) actions.push({ type: "add_tag", tag: tagName.trim() });
    if (actions.length === 0) return alert("Adicione pelo menos uma ação (resposta, tarefa ou tag).");

    const triggerConfig: any = {};
    if (trigger === "message_received" && keywords.trim()) {
      triggerConfig.keywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    }
    if (trigger === "inactivity") triggerConfig.days = Number(inactivityDays) || 30;

    setSaving(true);
    try {
      await apiPost("/automations", { name, triggerType: trigger, triggerConfig, actions, enabled: true }, token);
      setShowNew(false);
      resetForm();
      onChanged();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(a: any) {
    try {
      await apiPatch(`/automations/${a.id}`, { enabled: !a.enabled }, token);
      onChanged();
    } catch (err: any) { alert(err.message); }
  }

  async function remove(a: any) {
    if (!confirm(`Excluir o fluxo "${a.name}"?`)) return;
    try {
      await apiDelete(`/automations/${a.id}`, token);
      onChanged();
    } catch (err: any) { alert(err.message); }
  }

  return (
    <Card>
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Automações</div>
            <div className="text-sm text-slate-500">Robô de atendimento: responda, crie tarefas e organize leads sem mexer um dedo</div>
          </div>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Novo fluxo
          </button>
        </div>
      </div>
      <div className="p-4 pt-0 space-y-3">
        {automations.length === 0 && (
          <div className="rounded-2xl border p-6 text-center text-sm text-slate-500">
            Nenhum fluxo ainda. Crie o primeiro. Ex.: responder automaticamente quem manda "preço".
          </div>
        )}
        {automations.map((a) => (
          <div key={a.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{a.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Gatilho: {triggerLabel[a.triggerType] ?? a.triggerType}
                  {a.triggerConfig?.keywords?.length > 0 && ` • palavras: ${a.triggerConfig.keywords.join(", ")}`}
                  {a.triggerConfig?.days && ` • ${a.triggerConfig.days} dias`}
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {(Array.isArray(a.actions) ? a.actions : []).map((act: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700">
                      {act.type === "send_message" && <><MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Responde: "{act.text}"</>}
                      {act.type === "create_task" && <><ListTodo className="h-3.5 w-3.5 text-amber-500" /> Cria tarefa: {act.title}</>}
                      {act.type === "add_tag" && <><TagIcon className="h-3.5 w-3.5 text-green-600" /> Adiciona tag: {act.tag}</>}
                      {!["send_message", "create_task", "add_tag"].includes(act.type) && <><Zap className="h-3.5 w-3.5" /> {act.type}</>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggle(a)}
                  className={`relative h-6 w-11 rounded-full transition ${a.enabled ? "bg-green-500" : "bg-slate-300"}`}
                  title={a.enabled ? "Desligar" : "Ligar"}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${a.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <button onClick={() => remove(a)} className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Excluir fluxo">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border p-4 text-sm text-slate-500">
          Os fluxos rodam automaticamente quando o gatilho acontece (ex.: cliente manda mensagem no WhatsApp). Respostas automáticas saem pelo canal real quando ele está conectado em Configurações.
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <span className="font-semibold">Novo fluxo de automação</span>
              <button onClick={() => setShowNew(false)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome do fluxo *</label>
                <Input required value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ex.: Resposta automática de preço" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Quando acontecer… (gatilho)</label>
                <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200">
                  <option value="message_received">Mensagem recebida</option>
                  <option value="stage_changed">Negócio mudou de etapa</option>
                  <option value="inactivity">Lead inativo há X dias</option>
                </select>
              </div>

              {trigger === "message_received" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Apenas se contiver as palavras (opcional)</label>
                  <Input value={keywords} onChange={(e: any) => setKeywords(e.target.value)} placeholder="preço, valor, quanto custa" />
                  <p className="mt-1 text-xs text-slate-500">Separe por vírgula. Vazio = qualquer mensagem.</p>
                </div>
              )}
              {trigger === "inactivity" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Dias sem interação</label>
                  <Input type="number" value={inactivityDays} onChange={(e: any) => setInactivityDays(e.target.value)} />
                </div>
              )}

              <div className="rounded-2xl border p-4 space-y-3">
                <div className="text-sm font-semibold">Então faça… (ações)</div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium"><MessageSquare className="h-3.5 w-3.5" /> Responder automaticamente</label>
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Olá! Recebemos sua mensagem e já vamos te atender. 😊" className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 min-h-[60px]" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium"><ListTodo className="h-3.5 w-3.5" /> Criar tarefa para a equipe</label>
                  <Input value={taskTitle} onChange={(e: any) => setTaskTitle(e.target.value)} placeholder="Responder lead em até 15 min" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium"><TagIcon className="h-3.5 w-3.5" /> Adicionar tag ao contato</label>
                  <Input value={tagName} onChange={(e: any) => setTagName(e.target.value)} placeholder="Quente" />
                </div>
                <p className="text-xs text-slate-500">Preencha só o que quiser (pelo menos uma ação).</p>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Salvando…" : "Criar fluxo"}
                </button>
                <button type="button" onClick={() => setShowNew(false)} className="rounded-2xl border px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
