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

export interface PushOptions {
  // Se traduce a la cabecera Urgency del protocolo Web Push. En Android, FCM
  // la mapea a la prioridad del mensaje: con "normal" el aviso queda diferido
  // mientras el teléfono está en Doze (puede tardar horas); con "high"
  // despierta el aparato. Un MP es tiempo real, un recordatorio de riego no.
  urgency?: "very-low" | "low" | "normal" | "high";
  // Cuánto lo retiene FCM si el aparato está sin conexión. El default de
  // web-push son 4 semanas: para un aviso de "te escribieron" es absurdo.
  ttlSeconds?: number;
}

// Envía una notificación a una suscripción. Lanza si falla (el llamador
// decide qué hacer, ej. borrar suscripciones vencidas con statusCode 404/410).
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
  options: PushOptions = {}
): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    {
      urgency: options.urgency ?? "normal",
      ...(options.ttlSeconds !== undefined ? { TTL: options.ttlSeconds } : {}),
    }
  );
}
