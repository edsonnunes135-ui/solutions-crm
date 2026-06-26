import { describe, it, expect } from "vitest";
import { normalize, flowMatches } from "./flowMatch";

describe("normalize", () => {
  it("minúsculas + remove acentos", () => {
    expect(normalize("Preço")).toBe("preco");
    expect(normalize("AÇÃO É boa")).toBe("acao e boa");
    expect(normalize("")).toBe("");
  });
});

describe("flowMatches", () => {
  it("casa gatilho ignorando acento e caixa", () => {
    expect(flowMatches(["preço"], "oi, qual o preco?", false)).toBe(true);
    expect(flowMatches(["preço"], "QUAL O PREÇO", false)).toBe(true);
    expect(flowMatches(["valor", "quanto custa"], "quanto custa o plano?", false)).toBe(true);
  });

  it("não casa quando o texto não contém o gatilho", () => {
    expect(flowMatches(["preço"], "bom dia, tudo bem?", false)).toBe(false);
  });

  it("sem gatilhos = fluxo de boas-vindas só na 1ª mensagem", () => {
    expect(flowMatches([], "oi", true)).toBe(true);
    expect(flowMatches([], "oi", false)).toBe(false);
  });

  it("ignora gatilhos vazios / entrada inválida", () => {
    expect(flowMatches(["", "  "], "qualquer coisa", false)).toBe(false);
    expect(flowMatches(undefined as any, "x", true)).toBe(true);
  });
});
