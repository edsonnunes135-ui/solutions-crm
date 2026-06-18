import React, { useState } from "react";

/**
 * Mascote Foxy. Renderiza /foxy.png (coloque o arquivo em apps/web/public/).
 * Enquanto o arquivo não existir, o componente some sozinho (não quebra a tela).
 */
export default function Foxy({
  size = 96,
  float = false,
  pose = "",
  className = "",
}: {
  size?: number;
  float?: boolean;
  /** "", "pensando", "aceno", "feliz", "venda", "icone" */
  pose?: string;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src={pose ? `/foxy-${pose}.png` : "/foxy.png"}
      alt="Foxy, a assistente da Solutions"
      onError={() => setOk(false)}
      draggable={false}
      className={`${float ? "foxy-float" : ""} select-none ${className}`}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
