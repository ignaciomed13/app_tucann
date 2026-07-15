"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/notifications/web-push";

export type MessageState = { error: string } | undefined;

// Traduce los errores que levantan los triggers de la DB a mensajes claros.
function friendlyError(message: string): string {
  if (/sender_no_alias/.test(message)) {
    return "Primero elegí tu alias en la comunidad para poder enviar mensajes.";
  }
  if (/recipient_no_alias/.test(message)) {
    return "Ese usuario todavía no tiene alias en la comunidad.";
  }
  if (/recipient_dms_disabled/.test(message)) {
    return "Este usuario tiene los mensajes privados desactivados.";
  }
  return message;
}

export async function sendMessage(
  _prev: MessageState,
  formData: FormData
): Promise<MessageState> {
  await requireUser();
  const recipientId = String(formData.get("recipient_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!recipientId) return { error: "Falta el destinatario." };
  if (!body) return { error: "Escribí un mensaje." };
  if (body.length > 4000) return { error: "El mensaje es muy largo (máx. 4000)." };

  // sender_id lo pone el default auth.uid(); los alias los fuerza el trigger.
  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("direct_messages")
    .insert({ recipient_id: recipientId, body })
    .select("sender_id, sender_alias")
    .single();

  if (error) return { error: friendlyError(error.message) };

  // Push al receptor, fire-and-forget: si falla, el mensaje ya quedó enviado.
  try {
    await pushNewDmNotification(
      recipientId,
      inserted.sender_alias,
      inserted.sender_id
    );
  } catch {
    // Sin claves VAPID o error de red: el MP igual está en la bandeja.
  }

  revalidatePath(`/dashboard/mensajes/${recipientId}`);
  revalidatePath("/dashboard/mensajes");
  return undefined;
}

// Notifica el MP a todos los dispositivos del receptor. Usa el admin client
// porque RLS (correctamente) impide leer push_subscriptions ajenas. Privacidad:
// el payload lleva solo el alias del remitente, nunca el contenido del mensaje
// (nada sensible en la pantalla de bloqueo).
async function pushNewDmNotification(
  recipientId: string,
  senderAlias: string,
  senderId: string
) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", recipientId);

  for (const sub of subs ?? []) {
    try {
      await sendPush(sub, {
        title: "✉️ Nuevo mensaje en TuCann",
        body: `${senderAlias} te escribió.`,
        url: `/dashboard/mensajes/${senderId}`,
      });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }
}

// Marca como leídos todos los mensajes recibidos de un usuario. Idempotente.
export async function markConversationRead(otherUserId: string) {
  const user = await requireUser();
  if (!otherUserId) return;

  const supabase = await createClient();
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("sender_id", otherUserId)
    .is("read_at", null);
}

export async function setDmEnabled(formData: FormData) {
  const user = await requireUser();
  const enabled = String(formData.get("enabled") ?? "") === "true";

  const supabase = await createClient();
  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      forum_dms_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/dashboard/comunidad");
}
