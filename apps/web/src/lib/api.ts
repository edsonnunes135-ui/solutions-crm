const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Trata a resposta. Em 402 (limite/recurso de plano), dispara um evento global
 * "plan-limit" para o app mostrar um aviso amigável de upgrade — sem precisar
 * tratar isso em cada tela.
 */
async function handle(r: Response) {
  if (!r.ok) {
    const text = await r.text();
    if (r.status === 402) {
      try {
        const j = JSON.parse(text);
        if (j?.error === "plan_limit_reached" || j?.error === "plan_upgrade_required") {
          window.dispatchEvent(new CustomEvent("plan-limit", { detail: j }));
        }
      } catch {
        /* corpo não-JSON: ignora */
      }
    }
    throw new Error(text);
  }
  return r.json();
}

export async function apiGet(path: string, token?: string) {
  const r = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return handle(r);
}

export async function apiPost(path: string, body: any, token?: string) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handle(r);
}

export async function apiPut(path: string, body: any, token?: string) {
  const r = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handle(r);
}

export async function apiDelete(path: string, token?: string) {
  const r = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return handle(r);
}

export async function apiPatch(path: string, body: any, token?: string) {
  const r = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handle(r);
}
