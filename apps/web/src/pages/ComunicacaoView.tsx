import React from "react";
import ChatBox from "../components/ChatBox";
import { getUser } from "../lib/auth";

export default function ComunicacaoView({ token }: { token: string }) {
  const meId = getUser()?.id ?? "";
  return (
    <div className="space-y-4 p-1">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Chat da equipe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Converse com sua equipe em tempo real. Todos os vendedores e gestores da empresa veem este canal.
        </p>
      </div>
      <ChatBox
        token={token}
        loadPath="/chat/team"
        sendPath="/chat/team"
        meId={meId}
        placeholder="Mensagem para a equipe…"
        emptyHint="Nenhuma mensagem ainda. Diga um oi pra equipe! 👋"
      />
    </div>
  );
}
