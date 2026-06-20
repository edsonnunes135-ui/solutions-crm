import { ensureAuth } from "../middlewares/ensureAuth";
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../lib/email";

export const authRouter = Router();

const RegisterSchema = z.object({
  orgName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "minimo 8 caracteres")
    .regex(/[a-zA-Z]/, "precisa de letra")
    .regex(/[0-9]/, "precisa de numero"),
  marca: z.string().optional(), // white-label: orgId do parceiro (revenda) que trouxe o cliente
});

authRouter.post("/auth/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });

  const { orgName, name, email, password, marca } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "email_in_use" });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const org = await prisma.organization.create({ data: { name: orgName, trialEndsAt } });

  // White-label: se veio pelo link de um parceiro, vincula o cliente a ele e
  // herda a marca do parceiro (logo, nome, cor) — o cliente nunca vê "Solutions".
  let brand: { brandName?: string; brandLogoUrl?: string } = {};
  if (marca && marca !== org.id) {
    const reseller = await prisma.organization.findUnique({ where: { id: marca }, include: { setting: true } });
    if (reseller) {
      await prisma.organization.update({ where: { id: org.id }, data: { resellerOrgId: reseller.id } });
      const rs = reseller.setting;
      if (rs && (rs.brandName || rs.brandColor || rs.brandLogoUrl)) {
        await prisma.orgSetting.create({
          data: { orgId: org.id, brandName: rs.brandName, brandColor: rs.brandColor, brandLogoUrl: rs.brandLogoUrl },
        });
        brand = { brandName: rs.brandName ?? undefined, brandLogoUrl: rs.brandLogoUrl ?? undefined };
      }
    }
  }
  const user = await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10) },
  });
  await prisma.membership.create({
    data: { orgId: org.id, userId: user.id, role: "owner" },
  });

  // Cria funil padrão para a organização
  await prisma.pipeline.create({
    data: {
      orgId: org.id,
      name: "Vendas",
      kind: "sales",
      stages: {
        create: [
          { orgId: org.id, name: "Novo", order: 1 },
          { orgId: org.id, name: "Qualificando", order: 2 },
          { orgId: org.id, name: "Proposta", order: 3 },
          { orgId: org.id, name: "Ganho", order: 4 },
          { orgId: org.id, name: "Perdido", order: 5 },
        ],
      },
    },
  });

  // E-mail de boas-vindas (best-effort — nunca bloqueia o cadastro)
  sendWelcomeEmail({ to: email, name, orgName, brandName: brand.brandName, brandLogoUrl: brand.brandLogoUrl }).catch(() => {});

  const secret = process.env.JWT_SECRET || "change_me";
  const token = jwt.sign({ userId: user.id, orgId: org.id, role: "owner" }, secret, { expiresIn: "7d" });
  res.json({ token, orgId: org.id, role: "owner", user: { id: user.id, name: user.name, email: user.email } });
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  orgId: z.string().optional(),
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user) return res.status(401).json({ error: "bad_credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "bad_credentials" });

  const membership = user.memberships[0];
  if (!membership) return res.status(403).json({ error: "no_org" });

  const secret = process.env.JWT_SECRET || "change_me";
  const token = jwt.sign({ userId: user.id, orgId: membership.orgId, role: membership.role }, secret, { expiresIn: "7d" });

  res.json({
    token,
    orgId: membership.orgId,
    role: membership.role,
    user: { id: user.id, name: user.name, email: user.email },
  });
});
// ── Recuperação de senha ("Esqueci a senha") ─────────────────────────────────
const ForgotSchema = z.object({ email: z.string().email() });
authRouter.post("/auth/forgot-password", async (req, res) => {
  const parsed = ForgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Sempre responde ok — não revela se o e-mail existe (evita descobrir contas)
  if (user) {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
    await prisma.user.update({ where: { id: user.id }, data: { resetCode: code, resetCodeExpiresAt: expires } });
    sendPasswordResetEmail({ to: user.email, name: user.name, code }).catch(() => {});
  }
  res.json({ ok: true });
});

const ResetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  password: z
    .string()
    .min(8, "minimo 8 caracteres")
    .regex(/[a-zA-Z]/, "precisa de letra")
    .regex(/[0-9]/, "precisa de numero"),
});
authRouter.post("/auth/reset-password", async (req, res) => {
  const parsed = ResetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
  const { email, code, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.resetCode || !user.resetCodeExpiresAt || user.resetCode !== code) {
    return res.status(400).json({ error: "invalid_code" });
  }
  if (user.resetCodeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "code_expired" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10), resetCode: null, resetCodeExpiresAt: null },
  });
  res.json({ ok: true });
});

authRouter.get("/me", ensureAuth, async (req, res) => {
const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "missing_token" });
  }

  const [, token] = authHeader.split(" ");

  try {
    const secret = process.env.JWT_SECRET || "change_me";
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      orgId: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    res.json({
      user,
      orgId: decoded.orgId,
      role: decoded.role,
    });
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
});

// Atualizar o próprio perfil (nome e/ou e-mail de login)
authRouter.put("/me", requireAuth, async (req: AuthedRequest, res) => {
  const Body = z.object({ name: z.string().min(2).optional(), email: z.string().email().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });

  if (parsed.data.email) {
    const exists = await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id: req.user!.userId } } });
    if (exists) return res.status(409).json({ error: "email_in_use" });
  }

  const data: { name?: string; email?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.email) data.email = parsed.data.email;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
    select: { id: true, name: true, email: true },
  });
  res.json({ ok: true, user });
});

