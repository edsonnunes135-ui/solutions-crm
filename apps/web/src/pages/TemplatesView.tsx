import React, { useState } from "react";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { apiPost } from "../lib/api";

type Tpl = { id: string; emoji: string; name: string; desc: string; stages: string[]; tint: string };

// Modelos de funil prontos por segmento — 1 clique e o funil já está montado.
const NICHE_TEMPLATES: Tpl[] = [
  { id: "clinica", emoji: "🩺", name: "Clínica / Saúde & Estética", desc: "Da avaliação ao pós-atendimento.", stages: ["Novo contato", "Avaliação agendada", "Compareceu", "Em tratamento", "Concluído", "Não compareceu"], tint: "from-emerald-500 to-teal-500" },
  { id: "imobiliaria", emoji: "🏠", name: "Imobiliária", desc: "Do lead à assinatura do contrato.", stages: ["Lead", "Visita agendada", "Visita realizada", "Proposta", "Fechado", "Perdido"], tint: "from-blue-500 to-indigo-500" },
  { id: "ecommerce", emoji: "🛒", name: "E-commerce / Loja online", desc: "Do interesse à recompra.", stages: ["Interesse", "Negociando", "Aguardando pagamento", "Pago", "Recompra", "Perdido"], tint: "from-violet-500 to-fuchsia-500" },
  { id: "servicos", emoji: "💼", name: "Serviços / Agência", desc: "Da proposta ao contrato.", stages: ["Lead", "Diagnóstico", "Proposta enviada", "Negociação", "Contrato fechado", "Perdido"], tint: "from-amber-500 to-orange-500" },
  { id: "educacao", emoji: "🎓", name: "Educação / Cursos", desc: "Do interessado ao aluno ativo.", stages: ["Interessado", "Aula experimental", "Matrícula", "Aluno ativo", "Desistiu"], tint: "from-sky-500 to-cyan-500" },
  { id: "alimentacao", emoji: "🍔", name: "Restaurante / Delivery", desc: "Do 1º pedido à fidelização.", stages: ["Novo cliente", "Primeiro pedido", "Cliente recorrente", "Fiel", "Inativo"], tint: "from-rose-500 to-pink-500" },
];

export default function TemplatesView({ token }: { token: string }) {
  const [tplBusy, setTplBusy] = useState("");
  const [tplMsg, setTplMsg] = useState("");
  const [doneId, setDoneId] = useState("");

  async function applyTemplate(tpl: Tpl) {
    if (!confirm(`Criar o funil "${tpl.name}"?\n\nEtapas: ${tpl.stages.join(" → ")}`)) return;
    setTplBusy(tpl.id);
    setTplMsg("");
    try {
      await apiPost("/pipelines", { name: tpl.name, kind: "sales", stages: tpl.stages.map((name) => ({ name })) }, token);
      setDoneId(tpl.id);
      setTplMsg(`✅ Funil "${tpl.name}" criado! Abra a aba Funil para ver.`);
    } catch (err: any) {
      setTplMsg(`Erro: ${err.message}`);
    } finally {
      setTplBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white"><Sparkles className="h-4 w-4" /></span>
          Templates de funil por nicho
        </h1>
        <p className="mt-1 text-sm text-slate-500">Comece com um funil pronto e testado para o seu segmento — montado em 1 clique.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {NICHE_TEMPLATES.map((tpl) => {
          const done = doneId === tpl.id;
          return (
            <div key={tpl.id} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className={`h-1 w-full bg-gradient-to-r ${tpl.tint}`} />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tpl.tint} text-xl shadow-sm`}>{tpl.emoji}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">{tpl.name}</div>
                    <div className="truncate text-xs text-slate-500">{tpl.desc}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-1 flex-wrap items-center gap-x-1 gap-y-1.5">
                  {tpl.stages.map((s, i) => (
                    <React.Fragment key={s}>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{s}</span>
                      {i < tpl.stages.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />}
                    </React.Fragment>
                  ))}
                </div>

                <button
                  onClick={() => applyTemplate(tpl)}
                  disabled={tplBusy === tpl.id}
                  className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 ${done ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                >
                  {tplBusy === tpl.id ? "Aplicando…" : done ? (<><Check className="h-4 w-4" /> Criado</>) : "Usar este modelo"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {tplMsg && <div className={`text-sm ${tplMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{tplMsg}</div>}
    </div>
  );
}
