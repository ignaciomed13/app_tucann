"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isForumCategorySlug } from "@/lib/forum/categories";

export type ForumState = { error: string } | undefined;

// Alias: 3–24 caracteres, letras/números/espacio y . _ - (sin @ para que nunca
// se parezca a un email).
const ALIAS_RE = /^[a-zA-Z0-9ñÑ._\- ]{3,24}$/;

export async function setForumAlias(
  _prev: ForumState,
  formData: FormData
): Promise<ForumState> {
  const user = await requireUser();
  const alias = String(formData.get("alias") ?? "").trim();

  if (!ALIAS_RE.test(alias)) {
    return {
      error:
        "El alias debe tener entre 3 y 24 caracteres (letras, números, espacio y . _ -).",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      forum_alias: alias,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    // 23505 = unique_violation: el índice case-insensitive ya tiene ese alias.
    if (error.code === "23505") {
      return { error: "Ese alias ya está en uso. Probá con otro." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/comunidad");
  return undefined;
}

export async function createThread(
  _prev: ForumState,
  formData: FormData
): Promise<ForumState> {
  await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!title) return { error: "Ponele un título al tema." };
  if (title.length > 140) return { error: "El título es muy largo (máx. 140)." };
  if (!body) return { error: "Escribí algo en el mensaje." };
  if (!isForumCategorySlug(category)) {
    return { error: "Elegí una sección para el tema." };
  }

  // author_id lo pone el default auth.uid(); author_alias lo fuerza el trigger
  // desde user_settings. Si el usuario no tiene alias, el insert falla.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_threads")
    .insert({ title, body, category })
    .select("id")
    .single();

  if (error) {
    if (/forum_alias_required/.test(error.message)) {
      return { error: "Primero elegí tu alias para participar." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/comunidad");
  redirect(`/dashboard/comunidad/${data.id}`);
}

export async function createPost(
  _prev: ForumState,
  formData: FormData
): Promise<ForumState> {
  await requireUser();
  const threadId = String(formData.get("thread_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!threadId) return { error: "Falta el tema." };
  if (!body) return { error: "Escribí una respuesta." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("forum_posts")
    .insert({ thread_id: threadId, body });

  if (error) {
    if (/forum_alias_required/.test(error.message)) {
      return { error: "Primero elegí tu alias para participar." };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/comunidad/${threadId}`);
  return undefined;
}
