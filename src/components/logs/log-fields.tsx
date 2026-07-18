import type { LogType, SubstrateType } from "@/lib/supabase/database.types";
import {
  suggestedWatering,
  TRAINING_TECHNIQUES,
  SANITY_ISSUES,
  SEVERITIES,
} from "@/lib/logs/validation";
import { substrateWateringNote } from "@/lib/grows/attributes";

const inputClass = "rounded border border-neutral-300 px-3 py-2";

// Campos específicos de cada tipo de log; compartidos entre alta y edición.
export function LogTypeFields({
  type,
  currentPotVolumeL,
  substrate,
  defaults,
}: {
  type: LogType;
  currentPotVolumeL: number;
  substrate?: SubstrateType;
  defaults?: Partial<Record<string, string | number>>;
}) {
  const d = (key: string) => defaults?.[key] ?? "";

  switch (type) {
    case "environmental":
      return (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Temperatura (°C)
            <input name="temperature_c" type="number" step="0.1" defaultValue={d("temperature_c")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Humedad (%)
            <input name="humidity_pct" type="number" step="1" min="0" max="100" defaultValue={d("humidity_pct")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            EC (mS/cm)
            <input name="ec" type="number" step="0.01" min="0" defaultValue={d("ec")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            pH
            <input name="ph" type="number" step="0.1" min="0" max="14" defaultValue={d("ph")} className={inputClass} />
          </label>
        </div>
      );

    case "watering": {
      const { minL, maxL } = suggestedWatering(currentPotVolumeL);
      const note = substrate ? substrateWateringNote(substrate) : null;
      return (
        <label className="flex flex-col gap-1 text-sm">
          Volumen aplicado (L)
          <input name="volume_l" type="number" step="0.01" min="0.01" required defaultValue={d("volume_l")} className={inputClass} />
          <span className="text-xs text-neutral-500">
            Sugerido para tu maceta de {currentPotVolumeL} L: entre {minL} y {maxL} L (10–15%).
          </span>
          {note && <span className="text-xs text-neutral-500">{note}</span>}
        </label>
      );
    }

    case "nutrition":
      return (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Producto
            <input name="product" required defaultValue={d("product")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Dosis
            <input name="dose" required placeholder="ej: 2 ml/L" defaultValue={d("dose")} className={inputClass} />
          </label>
        </div>
      );

    case "observation":
      return (
        <label className="flex flex-col gap-1 text-sm">
          Observación
          <textarea name="notes" required rows={3} defaultValue={d("notes")} className={inputClass} />
        </label>
      );

    case "transplant":
      return (
        <label className="flex flex-col gap-1 text-sm">
          Nuevo volumen de maceta (L)
          <input name="new_volume_l" type="number" step="0.1" min="0.1" required defaultValue={d("new_volume_l")} className={inputClass} />
          <span className="text-xs text-neutral-500">
            Actualiza el volumen actual de maceta en todo el sistema.
          </span>
        </label>
      );

    case "training":
      return (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Técnica
            <select name="technique" required defaultValue={d("technique")} className={inputClass}>
              <option value="" disabled>
                Elegí una técnica…
              </option>
              {TRAINING_TECHNIQUES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notas (opcional)
            <textarea name="notes" rows={2} defaultValue={d("notes")} className={inputClass} />
          </label>
        </div>
      );

    case "sanidad":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Plaga / enfermedad
              <select name="issue" required defaultValue={d("issue")} className={inputClass}>
                <option value="" disabled>
                  Elegí…
                </option>
                {SANITY_ISSUES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Severidad
              <select name="severity" required defaultValue={d("severity")} className={inputClass}>
                <option value="" disabled>
                  Elegí…
                </option>
                {SEVERITIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Notas (opcional)
            <textarea name="notes" rows={2} defaultValue={d("notes")} className={inputClass} />
          </label>
        </div>
      );

    case "cosecha":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Peso seco (g)
              <input name="dry_weight_g" type="number" step="0.1" min="0.1" required defaultValue={d("dry_weight_g")} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Peso en fresco (g, opcional)
              <input name="wet_weight_g" type="number" step="0.1" min="0.1" defaultValue={d("wet_weight_g")} className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Notas de cosecha / curado (opcional)
            <textarea name="notes" rows={2} placeholder="ej: tricomas ámbar, aroma cítrico, secado 10 días" defaultValue={d("notes")} className={inputClass} />
          </label>
        </div>
      );
  }
}

