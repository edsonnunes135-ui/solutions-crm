import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "./prisma";

export type ApiRequest = Request & { apiOrgId?: string };

/** Gera uma chave nova (mostrada UMA vez ao usuário). Formato: sk_live_<48 hex>. */
export function generateApiKey() {
  const raw = "sk_live_" + crypto.randomBytes(24).toString("hex");
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 14) };
}

/** Hash determinístico da chave (guardamos só o hash, nunca a chave em texto). */
export function hashApiKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Autentica uma requisição da API pública pela chave (header Authorization: Bearer
 * <key> ou X-API-Key). Define req.apiOrgId. Todas as queries devem usar esse orgId
 * (isolamento total entre empresas).
 */
export async function requireApiKey(req: ApiRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const key = hdr.startsWith("Bearer ") ? hdr.slice(7) : (req.headers["x-api-key"]?.toString() || "");
  if (!key) return res.status(401).json({ error: "missing_api_key" });

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) }, select: { id: true, orgId: true } });
  if (!apiKey) return res.status(401).json({ error: "invalid_api_key" });

  req.apiOrgId = apiKey.orgId;
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  next();
}
