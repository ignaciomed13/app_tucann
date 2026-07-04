"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/notifications/web-push";

export type PushState = { error?: string; success?: string } | undefined;

interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribeToPush(
  sub: BrowserSubscription
): Promise<PushState> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) return { error: error.message };
  return { success: "Notificaciones activadas." };
}

export async function unsubscribeFromPush(endpoint: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
}

export async function sendTestNotification(): Promise<PushState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return { error: "No hay notificaciones activas en este dispositivo." };
  }

  let sent = 0;
  for (const s of subs) {
    try {
      await sendPush(s, {
        title: "TuCann 🌱",
        body: "¡Las notificaciones funcionan! Este es un mensaje de prueba.",
        url: "/dashboard",
      });
      sent++;
    } catch (e) {
      // Suscripción vencida o inválida: la borramos.
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", s.endpoint);
      }
    }
  }

  if (sent === 0) {
    return { error: "No se pudo enviar (suscripción vencida). Volvé a activar." };
  }
  return { success: `Notificación de prueba enviada.` };
}
