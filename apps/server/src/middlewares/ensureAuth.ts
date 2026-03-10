import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  userId: string;
  orgId: string;
  role: string;
};

export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "missing_token" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "invalid_token" });
  }

  try {
    const secret = process.env.JWT_SECRET || "change_me";
    const decoded = jwt.verify(token, secret) as JwtPayload;

    (req as any).auth = decoded;

    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
