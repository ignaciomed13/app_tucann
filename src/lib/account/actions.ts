"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountState = { error?: string; success?: string } | undefined;

const PHOTO_BUCKET = "grow-photos";

// Guarda (o borra, si viene vacía) la fecha de vencimiento del REPROCANN.
// Con fecha cargada, el cron avisa 30 y 7 días antes y el día del vencimiento.
export async function saveReprocannExpiry(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await requireUser();
  const raw = String(formData.get("reprocann_expires_on") ?? "").trim();

  if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { error: "Fecha inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      reprocann_expires_on: raw || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/cuenta");
  return {
    success: raw
      ? "Fecha guardada. Te avisamos cuando se acerque el vencimiento."
      : "Fecha borrada: no vas a recibir avisos de vencimiento.",
  };
}

// Borra TODOS los archivos del usuario en el bucket de fotos. Los objetos de
// Storage no tienen FK, así que no los alcanza la cascada de auth.users: hay
// que limpiarlos a mano ANTES de borrar el usuario (después ya no queda
// ninguna referencia y quedarían huérfanos para siempre).
// Estructura fija de 2 niveles: {user_id}/{grow_id}/{uuid}.ext
async function deleteUserPhotos(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ error?: string }> {
  const storage = admin.storage.from(PHOTO_BUCKET);

  const { data: folders, error: rootErr } = await storage.list(userId, {
    limit: 1000,
  });
  if (rootErr) return { error: rootErr.message };

  for (const folder of folders ?? []) {
    // list() no es recursivo: cada entrada sin `id` es una subcarpeta (grow).
    const prefix = `${userId}/${folder.name}`;
    // Paginación defensiva: un grow largo puede superar los 1000 archivos.
    for (;;) {
      const { data: files, error: listErr } = await storage.list(prefix, {
        limit: 1000,
      });
      if (listErr) return { error: listErr.message };
      const paths = (files ?? [])
        .filter((f) => f.id !== null)
        .map((f) => `${prefix}/${f.name}`);
      if (paths.length === 0) break;
      const { error: rmErr } = await storage.remove(paths);
      if (rmErr) return { error: rmErr.message };
      if (paths.length < 1000) break;
    }
  }
  return {};
}

// Borra la cuenta completa del usuario autenticado: fotos de Storage primero,
// después el usuario de Auth (la cascada de FKs limpia todas las tablas:
// cultivos, logs, plantas, espacios, análisis, ajustes, foro y MP).
export async function deleteAccount(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await requireUser();

  const confirm = String(formData.get("confirm_text") ?? "").trim();
  if (confirm.toUpperCase() !== "BORRAR") {
    return { error: "Escribí BORRAR para confirmar." };
  }

  // createAdminClient tira si falta SUPABASE_SERVICE_ROLE_KEY (p. ej. en un
  // entorno local sin la key): mejor un mensaje claro que el error boundary.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "El borrado no está disponible en este entorno (falta la clave de administración).",
    };
  }

  const photos = await deleteUserPhotos(admin, user.id);
  if (photos.error) {
    return {
      error: `No se pudieron borrar tus fotos (${photos.error}). No se borró nada: probá de nuevo.`,
    };
  }

  // Retirar el alias del foro ANTES de borrar el usuario (después la fila de
  // user_settings ya no existe). Los mensajes quedan publicados bajo este
  // alias, así que nadie puede volver a registrarlo.
  const { data: settings } = await admin
    .from("user_settings")
    .select("forum_alias")
    .eq("user_id", user.id)
    .maybeSingle();
  const alias = settings?.forum_alias?.trim();
  if (alias) {
    const { error: retireErr } = await admin
      .from("retired_aliases")
      .upsert({ alias_lower: alias.toLowerCase() });
    if (retireErr) {
      return {
        error: `No se pudo reservar tu alias del foro (${retireErr.message}). No se borró la cuenta: probá de nuevo.`,
      };
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return { error: `No se pudo borrar la cuenta: ${delErr.message}` };
  }

  // El usuario ya no existe; limpiar las cookies de sesión del navegador.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
