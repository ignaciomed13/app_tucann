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
  // la usa para decidir si despierta el aparato o si el aviso espera a la
  // próxima ventana de mantenimiento del Doze (de ahí los atrasos de decenas
  // de minutos). Por eso el default es "high": si un aviso puede esperar, hay
  // que decirlo explícitamente, no al revés.
  urgency?: "very-low" | "low" | "normal" | "high";
  // Cuánto lo retiene FCM si el aparato está sin conexión. El default de
  // web-push son 4 semanas: para un aviso de "te escribieron" es absurdo.
  ttlSeconds?: number;
  // Etiqueta del origen del aviso ("dm-push", "forum-push", "reminder:riego").
  // Viaja en el payload y vuelve en el beacon de /api/push-latency, que es lo
  // que permite saber QUÉ tipo de aviso se atrasa, no solo que algo se atrasa.
  tag?: string;
}

// Envía una notificación a una suscripción. Lanza si falla (el llamador
// decide qué hacer, ej. borrar suscripciones vencidas con statusCode 404/410).
//
// Al payload se le agrega `sentAt` (epoch ms del server). El service worker lo
// compara con su propio reloj al recibir el push y reporta la latencia real:
// sin ese número, "llega tarde" no distingue entre un server lento y una
// entrega diferida por el sistema operativo, que se arreglan de formas
// distintas. Es una medición aproximada — depende del reloj del aparato — pero
// alcanza de sobra para separar segundos de media hora.
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
  options: PushOptions = {}
): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify({
      ...payload,
      sentAt: Date.now(),
      ...(options.tag ? { kind: options.tag } : {}),
    }),
    {
      urgency: options.urgency ?? "high",
      ...(options.ttlSeconds !== undefined ? { TTL: options.ttlSeconds } : {}),
    }
  );
}
