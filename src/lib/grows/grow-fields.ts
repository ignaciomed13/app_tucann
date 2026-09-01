import type {
  GrowEnvironment,
  LightType,
  PlantOrigin,
  PlantType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";
import { canBeCutting } from "@/lib/grows/cycle";
import {
  isValidEnvironment,
  isValidLightType,
  isValidSubstrate,
  isValidVariety,
} from "@/lib/grows/attributes";
import { GENETICS_INFO_MAX_CHARS } from "@/lib/analysis/genetics";

function isValidPlantType(value: string): value is PlantType {
  return value === "autofloreciente" || value === "fotoperiodica";
}

function isValidOrigin(value: string): value is PlantOrigin {
  return value === "semilla" || value === "esqueje";
}

export interface GrowFields {
  name: string;
  genetics: string;
  // Ficha de la cepa que el cultivador cargó (tipeada o leída de la ficha del
  // banco). Va entera al prompt de análisis.
  genetics_info: string | null;
  genetics_doc_path: string | null;
  plant_type: PlantType;
  origin: PlantOrigin;
  variety: Variety | null;
  plant_count: number;
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
  const geneticsInfo = String(formData.get("genetics_info") ?? "").trim();
  const geneticsDocPath = String(formData.get("genetics_doc_path") ?? "").trim();
  const plantType = String(formData.get("plant_type") ?? "");
  const origin = String(formData.get("origin") ?? "semilla");
  const substrate = String(formData.get("substrate") ?? "");
  const environment = String(formData.get("environment") ?? "");
  const rawLightType = String(formData.get("light_type") ?? "").trim();
  const lightSchedule = String(formData.get("light_schedule") ?? "").trim();
  const rawVariety = String(formData.get("variety") ?? "").trim();
  const rawSpaceId = String(formData.get("space_id") ?? "").trim();
  const rawPlantCount = String(formData.get("plant_count") ?? "1").trim();
  const startDate = String(formData.get("start_date") ?? "");

  if (!name || !genetics || !startDate) {
    return { error: "Completá nombre, genética y fecha de inicio." };
  }
  // Espeja el check de la migración: la ficha viaja en cada prompt de análisis.
  if (geneticsInfo.length > GENETICS_INFO_MAX_CHARS) {
    return {
      error: `La ficha de la genética no puede superar los ${GENETICS_INFO_MAX_CHARS} caracteres.`,
    };
  }

  const plantCount = Number(rawPlantCount || "1");
  if (!Number.isInteger(plantCount) || plantCount < 1) {
    return { error: "La cantidad de plantas debe ser un entero mayor o igual a 1." };
  }
  if (!isValidPlantType(plantType)) {
    return { error: "Elegí un tipo de planta válido." };
  }
  if (!isValidOrigin(origin)) {
    return { error: "Elegí un origen válido: semilla o esqueje." };
  }
  // Un esqueje hereda la edad de la madre: clonar una auto no rinde.
  if (origin === "esqueje" && !canBeCutting(plantType)) {
    return {
      error:
        "Las autoflorecientes no se clonan: el esqueje hereda la edad de la madre. Elegí fotoperiódica o cambiá el origen a semilla.",
    };
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
      genetics_info: geneticsInfo || null,
      genetics_doc_path: geneticsDocPath || null,
      plant_type: plantType,
      origin,
      variety,
      plant_count: plantCount,
      substrate,
      environment,
      light_type: lightType,
      light_schedule: lightSchedule || null,
      space_id: rawSpaceId || null,
      start_date: startDate,
    },
  };
}
