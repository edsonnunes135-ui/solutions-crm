import crypto from "crypto";

/**
 * Verificação simplificada de assinatura.
 * No produto, valide de acordo com as regras oficiais do provedor.
 */
export function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}
