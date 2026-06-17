/**
 * "CEO" / dono da plataforma (Solutions). NÃO é um cargo dentro de uma empresa:
 * é um privilégio que fica ACIMA de todas as empresas. Por segurança, quem é CEO
 * é definido APENAS por variável de ambiente (PLATFORM_ADMIN_EMAILS) — assim
 * ninguém consegue se promover pela interface. O padrão é a conta do dono.
 */
import { Response, NextFunction } from "express";
import { prisma } from "./prisma";
import { AuthedRequest } from "../middleware/auth";

const DEFAULT_ADMINS = "edson@solutions.com.br";

function adminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || DEFAULT_ADMINS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/** Middleware: só o(s) dono(s) da plataforma (CEO) passam. */
export async function requirePlatformAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true },
  });
  if (!isPlatformAdminEmail(user?.email)) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}
