import "server-only";
import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "Faltan las claves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)."
    );
  }
  if (!configured) {
    webpush.setVapidDetails(
      "mailto:medinnash3@gmail.com",
      publicKey,
      privateKey
    );
    configured = true;
  }
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Envía una notificación a una suscripción. Lanza si falla (el llamador
// decide qué hacer, ej. borrar suscripciones vencidas con statusCode 404/410).
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload
): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  );
}
