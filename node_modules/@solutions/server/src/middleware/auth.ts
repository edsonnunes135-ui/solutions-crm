import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthedRequest = Request & { user?: { userId: string; orgId: string; role: string } };

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
