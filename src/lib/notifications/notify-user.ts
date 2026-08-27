import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPush,
  type PushOptions,
  type PushPayload,
} from "@/lib/notifications/web-push";

// Manda una notificación a TODOS los dispositivos de un usuario.
//
// Usa el admin client porque la RLS (correctamente) impide leer
// push_subscriptions ajenas: avisarle a otro es justamente lo que ningún
// usuario puede hacer con su propio cliente.
//
// Nunca tira: un aviso que no sale no puede hacer fallar la acción que lo
// disparó (el mensaje o la respuesta ya se guardaron). Pero tampoco se traga
// en silencio — cada motivo de fallo queda en los logs del server (Vercel →
// Logs), que es lo único que hace diagnosticable un "no me llegó nada".
//
// `tag` es el prefijo de los logs, para saber de qué feature venía el aviso.
export async function notifyUser(
  userId: string,
  payload: PushPayload,
  options: PushOptions = {},
  tag = "push"
): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    // Sin service role no hay forma de leer las suscripciones del otro.
    console.error(`[${tag}] no se pudo crear el admin client:`, e);
    return;
  }

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error(`[${tag}] no se pudieron leer las suscripciones:`, error);
    return;
  }
  if (!subs || subs.length === 0) {
    // El caso más común: nunca activó las notificaciones en ningún aparato.
    console.warn(`[${tag}] ${userId} no tiene dispositivos suscritos`);
    return;
  }

  for (const sub of subs) {
    try {
      await sendPush(sub, payload, { tag, ...options });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      const body = (e as { body?: string }).body;
      // 404/410: el endpoint murió (desinstaló, limpió datos). Se borra.
      // Cualquier otro status (403 por VAPID que no coincide, 401, 5xx) NO
      // borra nada: es un problema de config o transitorio, y borrar la
      // suscripción dejaría al usuario sin avisos para siempre.
      console.error(
        `[${tag}] fallo al enviar a ${sub.endpoint.slice(0, 60)}… ` +
          `status=${status ?? "?"} body=${body ?? String(e)}`
      );
      if (status === 404 || status === 410) {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
    }
  }
}
