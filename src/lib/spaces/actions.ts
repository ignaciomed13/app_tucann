"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type SpaceFormState = { error: string } | undefined;

function positive(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function createSpace(
  _prevState: SpaceFormState,
  formData: FormData
): Promise<SpaceFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const width = positive(formData.get("width_cm"));
  const depth = positive(formData.get("depth_cm"));
  const rawHeight = String(formData.get("height_cm") ?? "").trim();

  if (!name) return { error: "Ingresá un nombre para el espacio." };
  if (width === null) return { error: "El ancho debe ser mayor a 0 (cm)." };
  if (depth === null) return { error: "La profundidad debe ser mayor a 0 (cm)." };

  let height: number | null = null;
  if (rawHeight !== "") {
    const h = positive(rawHeight);
    if (h === null) return { error: "El alto debe ser mayor a 0 (cm)." };
    height = h;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("spaces").insert({
    user_id: user.id,
    name,
    width_cm: width,
    depth_cm: depth,
    height_cm: height,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/spaces");
  return undefined;
}

export async function deleteSpace(formData: FormData) {
  const user = await requireUser();
  const spaceId = String(formData.get("space_id") ?? "");
  if (!spaceId) return;

  const supabase = await createClient();
  // El FK usa ON DELETE SET NULL: los cultivos quedan desasignados, no se borran.
  await supabase.from("spaces").delete().eq("id", spaceId).eq("user_id", user.id);

  revalidatePath("/dashboard/spaces");
}

export async function assignGrowToSpace(formData: FormData) {
  const user = await requireUser();
  const growId = String(formData.get("grow_id") ?? "");
  const rawSpace = String(formData.get("space_id") ?? "");
  if (!growId) return;

  const spaceId = rawSpace === "" ? null : rawSpace;

  const supabase = await createClient();
  await supabase
    .from("grows")
    .update({ space_id: spaceId })
    .eq("id", growId)
    .eq("user_id", user.id);

  revalidatePath(`/dashboard/grows/${growId}`);
  revalidatePath("/dashboard/spaces");
}
