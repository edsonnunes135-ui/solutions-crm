const KEY = "solutions_token";
const USER_KEY = "solutions_user";

export function saveAuth(token: string, user: { id: string; name: string; email: string }, orgId: string, role: string) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, orgId, role }));
}

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function getUser(): { id: string; name: string; email: string; orgId: string; role: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(IMP_KEY);
}

// ── Modo suporte (CEO "entra" em outra empresa) ──────────────────────────────
const BACKUP_KEY = "solutions_auth_backup";
const IMP_KEY = "solutions_impersonating";

/** Guarda a sessão atual (CEO) e assume a sessão da empresa-alvo. */
export function startImpersonation(token: string, orgId: string, role: string, orgName: string) {
  const curToken = localStorage.getItem(KEY);
  const curUser = localStorage.getItem(USER_KEY);
  if (curToken && curUser) {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ token: curToken, user: curUser }));
  }
  const u = getUser();
  if (u) saveAuth(token, { id: u.id, name: u.name, email: u.email }, orgId, role);
  localStorage.setItem(IMP_KEY, orgName);
}

export function impersonatingName(): string | null {
  return localStorage.getItem(IMP_KEY);
}

/** Volta para a sessão original do CEO. */
export function exitImpersonation() {
  const b = localStorage.getItem(BACKUP_KEY);
  if (b) {
    try {
      const { token, user } = JSON.parse(b);
      localStorage.setItem(KEY, token);
      localStorage.setItem(USER_KEY, user);
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(IMP_KEY);
}
