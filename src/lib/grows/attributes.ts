import type {
  GrowEnvironment,
  LightType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";

export const VARIETIES: { value: Variety; label: string }[] = [
  { value: "indica", label: "Índica" },
  { value: "sativa", label: "Sativa" },
  { value: "hibrida_sativa", label: "Híbrida (predom. sativa)" },
  { value: "hibrida_indica", label: "Híbrida (predom. índica)" },
];

export const VARIETY_LABELS = Object.fromEntries(
  VARIETIES.map((v) => [v.value, v.label])
) as Record<Variety, string>;

// Versión corta para los chips del formulario, donde no entra el paréntesis.
export const VARIETIES_SHORT: { value: Variety; label: string }[] = [
  { value: "indica", label: "Índica" },
  { value: "sativa", label: "Sativa" },
  { value: "hibrida_indica", label: "Híbrida índica" },
  { value: "hibrida_sativa", label: "Híbrida sativa" },
];

export function isValidVariety(v: string): v is Variety {
  return VARIETIES.some((x) => x.value === v);
}

export const SUBSTRATES: { value: SubstrateType; label: string }[] = [
  { value: "tierra", label: "Tierra" },
  { value: "coco", label: "Coco" },
  { value: "hidroponia", label: "Hidroponía" },
  { value: "mix", label: "Mix / Perlita" },
];

export const ENVIRONMENTS: { value: GrowEnvironment; label: string }[] = [
  { value: "interior", label: "Interior" },
  { value: "exterior", label: "Exterior" },
  { value: "invernadero", label: "Invernadero" },
];

export const LIGHT_TYPES: { value: LightType; label: string }[] = [
  { value: "led", label: "LED" },
  { value: "hps", label: "HPS / Sodio" },
  { value: "cfl", label: "CFL / Bajo consumo" },
  { value: "natural", label: "Natural / Sol" },
  { value: "otro", label: "Otro" },
];

export const SUBSTRATE_LABELS = Object.fromEntries(
  SUBSTRATES.map((s) => [s.value, s.label])
) as Record<SubstrateType, string>;

export const ENVIRONMENT_LABELS = Object.fromEntries(
  ENVIRONMENTS.map((e) => [e.value, e.label])
) as Record<GrowEnvironment, string>;

export const LIGHT_TYPE_LABELS = Object.fromEntries(
  LIGHT_TYPES.map((l) => [l.value, l.label])
) as Record<LightType, string>;

export function isValidSubstrate(v: string): v is SubstrateType {
  return SUBSTRATES.some((s) => s.value === v);
}

export function isValidEnvironment(v: string): v is GrowEnvironment {
  return ENVIRONMENTS.some((e) => e.value === v);
}

export function isValidLightType(v: string): v is LightType {
  return LIGHT_TYPES.some((l) => l.value === v);
}

// El riego correcto depende del sustrato. Devuelve una nota específica para
// mostrar junto al volumen sugerido (o null si no hay matiz que agregar).
export function substrateWateringNote(substrate: SubstrateType): string | null {
  switch (substrate) {
    case "coco":
      return "En coco: regá más seguido con menos volumen, buscando ~10-20% de drenaje. El coco no debe secarse del todo.";
    case "hidroponia":
      return "En hidroponía el volumen de maceta no aplica igual: guiate por EC/pH de la solución, no por el % de la maceta.";
    case "mix":
      return "En mix/perlita drena más rápido que la tierra pura: puede requerir riegos algo más frecuentes.";
    case "tierra":
      return null;
  }
}
