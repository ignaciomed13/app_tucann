"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePartnerSubmission } from "@/lib/partners/submissions";

export type SubmissionState = { error?: string; success?: string } | undefined;

// Un usuario postula un growshop/vivero. Queda 'pending' hasta que el admin
// lo revise. La RLS ya fuerza user_id = auth.uid() y status = 'pending'.
export async function submitPartner(
  _prev: SubmissionState,
  formData: FormData
): Promise<SubmissionState> {
  const user = await requireUser();

  const parsed = parsePartnerSubmission(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();

  // Anti-spam simple: máximo 5 postulaciones pendientes por usuario.
  const { count } = await supabase
    .from("partner_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  if ((count ?? 0) >= 5) {
    return {
      error:
        "Ya tenés varias sugerencias en revisión. Esperá a que las revisemos antes de mandar más.",
    };
  }

  const { error } = await supabase
    .from("partner_submissions")
    .insert({ ...parsed.data });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/socios");
  return {
    success: "¡Gracias! Tu sugerencia quedó en revisión.",
  };
}

// Moderación (admin). Usa el service role para leer/escribir fuera de RLS;
// gateado por isAdmin sobre el usuario autenticado.
async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.id)) {
    throw new Error("No autorizado.");
  }
  return user;
}

// Aprueba una postulación: la copia al directorio público (partners) y marca
// la fila como 'approved'. Idempotente-ish: si ya no está pendiente, no hace
// nada (evita duplicar el partner ante doble click).
export async function approveSubmission(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("submission_id") ?? "").trim();
  if (!id) return;

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("partner_submissions")
    .select("id, name, category, description, city, province, url, status")
    .eq("id", id)
    .maybeSingle();
  if (!sub || sub.status !== "pending") return;

  const { error: insErr } = await admin.from("partners").insert({
    name: sub.name,
    category: sub.category,
    description: sub.description,
    city: sub.city,
    province: sub.province,
    url: sub.url,
    is_active: true,
  });
  if (insErr) throw new Error(insErr.message);

  await admin
    .from("partner_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard/socios");
  revalidatePath("/dashboard/socios/revision");
}

// Rechaza una postulación con una nota opcional para el usuario.
export async function rejectSubmission(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("submission_id") ?? "").trim();
  if (!id) return;
  const note = String(formData.get("review_note") ?? "").trim() || null;

  const admin = createAdminClient();
  await admin
    .from("partner_submissions")
    .update({
      status: "rejected",
      review_note: note,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");

  revalidatePath("/dashboard/socios");
  revalidatePath("/dashboard/socios/revision");
}
