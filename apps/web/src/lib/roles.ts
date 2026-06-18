// Rótulos oficiais dos cargos — MESMA fonte em todo o app (evita inconsistência).
//
// IMPORTANTE: "owner" é o DONO DA EMPRESA (o assinante que paga) = Gestor.
// NÃO é o CEO da plataforma — o CEO é separado (isPlatformAdmin, definido por
// e-mail no servidor) e não aparece como cargo aqui.
export const roleLabel: Record<string, string> = {
  owner: "Gestor",
  partner: "Sócio",
  admin: "Gerente",
  agent: "Vendedor",
  viewer: "Visualização",
};
