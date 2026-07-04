import type {
  GrowEnvironment,
  LightType,
  PlantType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";
import {
  isValidEnvironment,
  isValidLightType,
  isValidSubstrate,
  isValidVariety,
} from "@/lib/grows/attributes";

function isValidPlantType(value: string): value is PlantType {
  return value === "autofloreciente" || value === "fotoperiodica";
}

export interface GrowFields {
  name: string;
  genetics: string;
  plant_type: PlantType;
  variety: Variety | null;
  substrate: SubstrateType;
  environment: GrowEnvironment;
  light_type: LightType | null;
  light_schedule: string | null;
  space_id: string | null;
  start_date: string;
}

// Valida los campos descriptivos compartidos por crear y editar (sin el
// volumen de maceta, que se fija al crear y luego se ajusta con logs de
// trasplante). Puro y testeable.
export function parseGrowFields(
  formData: FormData
): { error: string } | { fields: GrowFields } {
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

  let lightType: LightType | null = null;
  if (rawLightType !== "") {
    if (!isValidLightType(rawLightType)) {
      return { error: "Elegí un tipo de luz válido." };
    }
    lightType = rawLightType;
  }

  let variety: Variety | null = null;
  if (rawVariety !== "") {
    if (!isValidVariety(rawVariety)) {
      return { error: "Elegí una variedad válida." };
    }
    variety = rawVariety;
  }

  return {
    fields: {
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
    },
  };
}
