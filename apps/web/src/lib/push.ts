import { apiGet, apiPost } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Ativa notificações push: registra SW, pede permissão, assina e envia ao servidor. */
export async function enablePush(token: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const cfg = await apiGet("/push/vapid-key", token);
  if (!cfg.enabled || !cfg.publicKey) return { ok: false, reason: "server_not_configured" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as unknown as BufferSource,
  });

  const json: any = sub.toJSON();
  await apiPost("/push/subscribe", { endpoint: json.endpoint, keys: json.keys }, token);
  return { ok: true };
}
