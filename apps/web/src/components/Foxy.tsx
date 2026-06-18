import React, { useState } from "react";

/**
 * Mascote Foxy. Renderiza /foxy.png (coloque o arquivo em apps/web/public/).
 * Enquanto o arquivo não existir, o componente some sozinho (não quebra a tela).
 */
export default function Foxy({
  size = 96,
  float = false,
  className = "",
}: {
  size?: number;
  float?: boolean;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src="/foxy.png"
      alt="Foxy, a assistente da Solutions"
      onError={() => setOk(false)}
      draggable={false}
      className={`${float ? "foxy-float" : ""} select-none ${className}`}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
