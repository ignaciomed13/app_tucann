"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { LightType, PlantType, Variety } from "@/lib/supabase/database.types";
import {
  isValidEnvironment,
  isValidLightType,
  isValidSubstrate,
  isValidVariety,
} from "@/lib/grows/attributes";

function isValidPlantType(value: string): value is PlantType {
  return value === "autofloreciente" || value === "fotoperiodica";
}

export type GrowFormState = { error: string } | undefined;

export async function createGrow(
  _prevState: GrowFormState,
  formData: FormData
): Promise<GrowFormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const genetics = String(formData.get("genetics") ?? "").trim();
  const plantType = String(formData.get("plant_type") ?? "");
  const substrate = String(formData.get("substrate") ?? "");
  const environment = String(formData.get("environment") ?? "");
  const rawLightType = String(formData.get("light_type") ?? "").trim();
  const lightSchedule = String(formData.get("light_schedule") ?? "").trim();
  const rawVariety = String(formData.get("variety") ?? "").trim();
  const rawSpaceId = String(formData.get("space_id") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const initialPotVolume = Number(formData.get("initial_pot_volume_l"));

  if (!name || !genetics || !startDate) {
    return { error: "Completá nombre, genética y fecha de inicio." };
  }
  if (!isValidPlantType(plantType)) {
    return { error: "Elegí un tipo de planta válido." };
  }
  if (!isValidSubstrate(substrate)) {
    return { error: "Elegí un sustrato válido." };
  }
  if (!isValidEnvironment(environment)) {
    return { error: "Elegí un ambiente válido." };
  }
  // La luz es opcional; si viene, debe ser un valor conocido.
  let lightType: LightType | null = null;
  if (rawLightType !== "") {
    if (!isValidLightType(rawLightType)) {
      return { error: "Elegí un tipo de luz válido." };
    }
    lightType = rawLightType;
  }
  // Variedad opcional; si viene, debe ser un valor conocido.
  let variety: Variety | null = null;
  if (rawVariety !== "") {
    if (!isValidVariety(rawVariety)) {
      return { error: "Elegí una variedad válida." };
    }
    variety = rawVariety;
  }
  if (!Number.isFinite(initialPotVolume) || initialPotVolume <= 0) {
    return { error: "El volumen de maceta debe ser un número mayor a 0." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("grows").insert({
    user_id: user.id,
    name,
    genetics,
    plant_type: plantType,
    variety,
    substrate,
    environment,
    light_type: lightType,
    light_schedule: lightSchedule || null,
    space_id: rawSpaceId || null,
    start_date: startDate,
    initial_pot_volume_l: initialPotVolume,
    current_pot_volume_l: initialPotVolume,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
