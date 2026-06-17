import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { apiPost } from "../lib/api";

// Modelos de funil prontos por segmento — 1 clique e o funil já está montado.
const NICHE_TEMPLATES: { id: string; emoji: string; name: string; desc: string; stages: string[] }[] = [
  { id: "clinica", emoji: "🩺", name: "Clínica / Saúde & Estética", desc: "Da avaliação ao pós-atendimento.", stages: ["Novo contato", "Avaliação agendada", "Compareceu", "Em tratamento", "Concluído", "Não compareceu"] },
  { id: "imobiliaria", emoji: "🏠", name: "Imobiliária", desc: "Do lead à assinatura do contrato.", stages: ["Lead", "Visita agendada", "Visita realizada", "Proposta", "Fechado", "Perdido"] },
  { id: "ecommerce", emoji: "🛒", name: "E-commerce / Loja online", desc: "Do interesse à recompra.", stages: ["Interesse", "Negociando", "Aguardando pagamento", "Pago", "Recompra", "Perdido"] },
  { id: "servicos", emoji: "💼", name: "Serviços / Agência", desc: "Da proposta ao contrato.", stages: ["Lead", "Diagnóstico", "Proposta enviada", "Negociação", "Contrato fechado", "Perdido"] },
  { id: "educacao", emoji: "🎓", name: "Educação / Cursos", desc: "Do interessado ao aluno ativo.", stages: ["Interessado", "Aula experimental", "Matrícula", "Aluno ativo", "Desistiu"] },
  { id: "alimentacao", emoji: "🍔", name: "Restaurante / Delivery", desc: "Do 1º pedido à fidelização.", stages: ["Novo cliente", "Primeiro pedido", "Cliente recorrente", "Fiel", "Inativo"] },
];

export default function TemplatesView({ token }: { token: string }) {
  const [tplBusy, setTplBusy] = useState("");
  const [tplMsg, setTplMsg] = useState("");

  async function applyTemplate(tpl: (typeof NICHE_TEMPLATES)[number]) {
    if (!confirm(`Criar o funil "${tpl.name}"?\n\nEtapas: ${tpl.stages.join(" → ")}`)) return;
    setTplBusy(tpl.id);
    setTplMsg("");
    try {
      await apiPost("/pipelines", { name: tpl.name, kind: "sales", stages: tpl.stages.map((name) => ({ name })) }, token);
      setTplMsg(`✅ Funil "${tpl.name}" criado! Abra a aba Funil para ver.`);
    } catch (err: any) {
      setTplMsg(`Erro: ${err.message}`);
    } finally {
      setTplBusy("");
    }
  }

  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-sky-500" /> Templates de funil por nicho
        </div>
        <div className="text-sm text-slate-500">Comece com um funil pronto para o seu segmento. Configure em 1 clique.</div>
      </div>
      <div className="p-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NICHE_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="flex flex-col rounded-2xl border p-4">
              <div className="text-2xl">{tpl.emoji}</div>
              <div className="mt-1 font-semibold">{tpl.name}</div>
              <div className="mt-1 text-xs text-slate-500">{tpl.desc}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {tpl.stages.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{s}</span>
                ))}
              </div>
              <button
                onClick={() => applyTemplate(tpl)}
                disabled={tplBusy === tpl.id}
                className="mt-3 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {tplBusy === tpl.id ? "Aplicando…" : "Usar este modelo"}
              </button>
            </div>
          ))}
        </div>
        {tplMsg && <div className={`mt-3 text-sm ${tplMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{tplMsg}</div>}
      </div>
    </div>
  );
}
