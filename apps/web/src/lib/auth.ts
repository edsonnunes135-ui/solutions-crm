const KEY = "solutions_token";
const USER_KEY = "solutions_user";

export function saveAuth(token: string, user: { id: string; name: string; email: string }, orgId: string) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, orgId }));
}

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function getUser(): { id: string; name: string; email: string; orgId: string } | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}
