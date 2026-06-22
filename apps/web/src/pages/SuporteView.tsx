import React from "react";
import ChatBox from "../components/ChatBox";
import { getUser } from "../lib/auth";

export default function SuporteView({ token }: { token: string }) {
  const meId = getUser()?.id ?? "";
  return (
    <div className="space-y-4 p-1">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Suporte</h1>
          <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">atendimento direto</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Dúvidas, ajuda ou sugestões? Fale direto com o suporte da Solutions. A gente responde por aqui mesmo.
        </p>
      </div>
      <ChatBox
        token={token}
        loadPath="/chat/support"
        sendPath="/chat/support"
        meId={meId}
        placeholder="Escreva sua dúvida para o suporte…"
        emptyHint="Tire suas dúvidas com o nosso suporte. Mande sua primeira mensagem! 🤝"
      />
    </div>
  );
}
