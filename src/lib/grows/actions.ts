"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { parseGrowFields } from "@/lib/grows/grow-fields";

export type GrowFormState = { error: string } | undefined;

export async function createGrow(
  _prevState: GrowFormState,
  formData: FormData
): Promise<GrowFormState> {
  const user = await requireUser();

  const parsed = parseGrowFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const initialPotVolume = Number(formData.get("initial_pot_volume_l"));
  if (!Number.isFinite(initialPotVolume) || initialPotVolume <= 0) {
    return { error: "El volumen de maceta debe ser un número mayor a 0." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("grows").insert({
    user_id: user.id,
    ...parsed.fields,
    initial_pot_volume_l: initialPotVolume,
    current_pot_volume_l: initialPotVolume,
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function updateGrow(
  _prevState: GrowFormState,
  formData: FormData
): Promise<GrowFormState> {
  const user = await requireUser();

  const growId = String(formData.get("grow_id") ?? "");
  if (!growId) return { error: "Falta el cultivo a editar." };

  const parsed = parseGrowFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  // El volumen de maceta no se edita acá: se ajusta con logs de trasplante.
  const { error, count } = await supabase
    .from("grows")
    .update(parsed.fields, { count: "exact" })
    .eq("id", growId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  if (count === 0) return { error: "No se encontró el cultivo." };

  redirect(`/dashboard/grows/${growId}`);
}

export async function deleteGrow(formData: FormData) {
  const user = await requireUser();
  const growId = String(formData.get("grow_id") ?? "");
  if (!growId) return;

  const supabase = await createClient();
  // Los logs del cultivo se borran en cascada por el FK.
  await supabase.from("grows").delete().eq("id", growId).eq("user_id", user.id);

  redirect("/dashboard");
}
