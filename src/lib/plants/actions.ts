"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type PlantFormState = { error: string } | undefined;

export async function createPlant(
  _prevState: PlantFormState,
  formData: FormData
): Promise<PlantFormState> {
  const user = await requireUser();

  const growId = String(formData.get("grow_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!growId) return { error: "Falta el cultivo." };
  if (!label) return { error: "Poné una etiqueta para la planta (ej. A1)." };
  if (label.length > 40) return { error: "La etiqueta es demasiado larga." };

  const supabase = await createClient();
  const { error } = await supabase.from("plants").insert({
    grow_id: growId,
    user_id: user.id,
    label,
    notes: notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/grows/${growId}`);
  return undefined;
}

export async function updatePlant(
  _prevState: PlantFormState,
  formData: FormData
): Promise<PlantFormState> {
  const user = await requireUser();

  const plantId = String(formData.get("plant_id") ?? "");
  const growId = String(formData.get("grow_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!plantId) return { error: "Falta la planta a editar." };
  if (!label) return { error: "Poné una etiqueta para la planta (ej. A1)." };
  if (label.length > 40) return { error: "La etiqueta es demasiado larga." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("plants")
    .update({ label, notes: notes || null }, { count: "exact" })
    .eq("id", plantId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  if (count === 0) return { error: "No se encontró la planta." };

  revalidatePath(`/dashboard/grows/${growId}`);
  return undefined;
}

export async function deletePlant(formData: FormData) {
  const user = await requireUser();
  const plantId = String(formData.get("plant_id") ?? "");
  const growId = String(formData.get("grow_id") ?? "");
  if (!plantId) return;

  const supabase = await createClient();
  // El FK de logs.plant_id usa ON DELETE SET NULL: los logs de la planta
  // quedan como del lote, no se borran.
  await supabase.from("plants").delete().eq("id", plantId).eq("user_id", user.id);

  revalidatePath(`/dashboard/grows/${growId}`);
}
