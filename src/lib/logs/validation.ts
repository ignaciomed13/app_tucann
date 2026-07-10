import type { LogData, LogType } from "@/lib/supabase/database.types";

export const LOG_TYPES: { value: LogType; label: string }[] = [
  { value: "environmental", label: "Ambiental" },
  { value: "watering", label: "Riego" },
  { value: "nutrition", label: "Nutrición" },
  { value: "observation", label: "Observaciones" },
  { value: "transplant", label: "Trasplante" },
  { value: "training", label: "Poda / Entrenamiento" },
  { value: "sanidad", label: "Sanidad (plaga/enfermedad)" },
  { value: "cosecha", label: "Cosecha" },
];

// Plagas y enfermedades comunes en cannabis.
export const SANITY_ISSUES: { value: string; label: string }[] = [
  { value: "arana_roja", label: "Araña roja" },
  { value: "trips", label: "Trips" },
  { value: "mosca_blanca", label: "Mosca blanca" },
  { value: "pulgon", label: "Pulgón" },
  { value: "cochinilla", label: "Cochinilla" },
  { value: "oruga", label: "Oruga" },
  { value: "fungus_gnats", label: "Mosquita del sustrato" },
  { value: "oidio", label: "Oídio" },
  { value: "botrytis", label: "Botrytis (moho gris)" },
  { value: "fusarium", label: "Fusarium" },
  { value: "pythium", label: "Pudrición de raíz (Pythium)" },
  { value: "roya", label: "Roya" },
  { value: "mancha_foliar", label: "Mancha foliar" },
  { value: "deficiencia", label: "Deficiencia nutricional" },
  { value: "otro", label: "Otro" },
];

export const SANITY_ISSUE_LABELS: Record<string, string> = Object.fromEntries(
  SANITY_ISSUES.map((i) => [i.value, i.label])
);

export const SEVERITIES: { value: string; label: string }[] = [
  { value: "leve", label: "Leve" },
  { value: "moderada", label: "Moderada" },
  { value: "severa", label: "Severa" },
];

export const TRAINING_TECHNIQUES: { value: string; label: string }[] = [
  { value: "despunte", label: "Despunte (topping)" },
  { value: "fim", label: "FIM" },
  { value: "lst", label: "LST (entrenamiento de bajo estrés)" },
  { value: "defoliacion", label: "Defoliación" },
  { value: "scrog", label: "SCROG (malla)" },
  { value: "supercropping", label: "Supercropping" },
  { value: "lollipop", label: "Lollipopping" },
  { value: "otro", label: "Otro" },
];

export const TRAINING_TECHNIQUE_LABELS: Record<string, string> =
  Object.fromEntries(TRAINING_TECHNIQUES.map((t) => [t.value, t.label]));

export const LOG_TYPE_LABELS: Record<LogType, string> = Object.fromEntries(
  LOG_TYPES.map(({ value, label }) => [value, label])
) as Record<LogType, string>;

export type ParseResult =
  | { ok: true; data: LogData }
  | { ok: false; error: string };

function optionalNumber(
  raw: FormDataEntryValue | null,
  label: string,
  { min, max }: { min?: number; max?: number } = {}
): { value?: number; error?: string } {
  const str = String(raw ?? "").trim();
  if (str === "") return {};
  const n = Number(str);
  if (!Number.isFinite(n)) return { error: `${label} debe ser un número.` };
  if (min !== undefined && n < min)
    return { error: `${label} debe ser mayor o igual a ${min}.` };
  if (max !== undefined && n > max)
    return { error: `${label} debe ser menor o igual a ${max}.` };
  return { value: n };
}

export function parseLogData(type: LogType, form: FormData): ParseResult {
  switch (type) {
    case "environmental": {
      const fields = [
        { key: "temperature_c", label: "Temperatura", opts: { min: -10, max: 60 } },
        { key: "humidity_pct", label: "Humedad", opts: { min: 0, max: 100 } },
        { key: "ec", label: "EC", opts: { min: 0, max: 10 } },
        { key: "ph", label: "pH", opts: { min: 0, max: 14 } },
      ] as const;

      const data: Record<string, number> = {};
      for (const { key, label, opts } of fields) {
        const { value, error } = optionalNumber(form.get(key), label, opts);
        if (error) return { ok: false, error };
        if (value !== undefined) data[key] = value;
      }
      if (Object.keys(data).length === 0) {
        return {
          ok: false,
          error: "Cargá al menos un valor ambiental (temperatura, humedad, EC o pH).",
        };
      }
      return { ok: true, data };
    }

    case "watering": {
      const { value, error } = optionalNumber(form.get("volume_l"), "Volumen", {
        min: 0.01,
      });
      if (error) return { ok: false, error };
      if (value === undefined)
        return { ok: false, error: "Ingresá el volumen de riego en litros." };
      return { ok: true, data: { volume_l: value } };
    }

    case "nutrition": {
      const product = String(form.get("product") ?? "").trim();
      const dose = String(form.get("dose") ?? "").trim();
      if (!product) return { ok: false, error: "Ingresá el producto aplicado." };
      if (!dose) return { ok: false, error: "Ingresá la dosis aplicada." };
      return { ok: true, data: { product, dose } };
    }

    case "observation": {
      const notes = String(form.get("notes") ?? "").trim();
      if (!notes) return { ok: false, error: "Escribí la observación." };
      return { ok: true, data: { notes } };
    }

    case "transplant": {
      const { value, error } = optionalNumber(
        form.get("new_volume_l"),
        "Nuevo volumen de maceta",
        { min: 0.01 }
      );
      if (error) return { ok: false, error };
      if (value === undefined)
        return {
          ok: false,
          error: "Ingresá el nuevo volumen de maceta en litros.",
        };
      return { ok: true, data: { new_volume_l: value } };
    }

    case "training": {
      const technique = String(form.get("technique") ?? "").trim();
      const notes = String(form.get("notes") ?? "").trim();
      if (!TRAINING_TECHNIQUES.some((t) => t.value === technique)) {
        return { ok: false, error: "Elegí una técnica de poda/entrenamiento." };
      }
      return {
        ok: true,
        data: notes ? { technique, notes } : { technique },
      };
    }

    case "sanidad": {
      const issue = String(form.get("issue") ?? "").trim();
      const severity = String(form.get("severity") ?? "").trim();
      const notes = String(form.get("notes") ?? "").trim();
      if (!SANITY_ISSUES.some((i) => i.value === issue)) {
        return { ok: false, error: "Elegí una plaga o enfermedad." };
      }
      if (!SEVERITIES.some((s) => s.value === severity)) {
        return { ok: false, error: "Elegí la severidad." };
      }
      return {
        ok: true,
        data: notes
          ? { issue, severity: severity as "leve" | "moderada" | "severa", notes }
          : { issue, severity: severity as "leve" | "moderada" | "severa" },
      };
    }

    case "cosecha": {
      const dry = optionalNumber(form.get("dry_weight_g"), "Peso seco", {
        min: 0.1,
      });
      if (dry.error) return { ok: false, error: dry.error };
      if (dry.value === undefined)
        return { ok: false, error: "Ingresá el peso seco en gramos." };

      const wet = optionalNumber(form.get("wet_weight_g"), "Peso en fresco", {
        min: 0.1,
      });
      if (wet.error) return { ok: false, error: wet.error };

      const notes = String(form.get("notes") ?? "").trim();
      const data: {
        dry_weight_g: number;
        wet_weight_g?: number;
        notes?: string;
      } = { dry_weight_g: dry.value };
      if (wet.value !== undefined) data.wet_weight_g = wet.value;
      if (notes) data.notes = notes;
      return { ok: true, data };
    }
  }
}

export function isValidLogType(value: string): value is LogType {
  return LOG_TYPES.some((t) => t.value === value);
}

// Riego sugerido: 10-15% del volumen actual de maceta.
export function suggestedWatering(potVolumeL: number): {
  minL: number;
  maxL: number;
} {
  const round = (n: number) => Math.round(n * 100) / 100;
  return { minL: round(potVolumeL * 0.1), maxL: round(potVolumeL * 0.15) };
}
