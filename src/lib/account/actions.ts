"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; success?: string } | undefined;

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
