import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & { user?: { userId: string; orgId: string; role: string } };

// Restringe a rota a papéis específicos (ex.: owner/admin)
export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}

// Papéis que enxergam TODA a empresa (gestor). Os demais (vendedor) são limitados.
const MANAGER_ROLES = ["owner", "partner", "admin"];
export function isManagerRole(role?: string) {
  return !!role && MANAGER_ROLES.includes(role);
}

/**
 * Filtro de "dono" para vendedores: o gestor vê tudo da empresa; o vendedor
 * (agent/viewer) só enxerga os negócios que são dele (ownerId = ele mesmo).
 * Use espalhando no `where` do Prisma: `where: { orgId, ...ownerScope(req) }`.
 */
export function ownerScope(req: AuthedRequest): { ownerId?: string } {
  return isManagerRole(req.user?.role) ? {} : { ownerId: req.user!.userId };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const secret = process.env.JWT_SECRET || "change_me";
    const payload = jwt.verify(token, secret) as any;
    req.user = { userId: payload.userId, orgId: payload.orgId, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}
