"use client";

import { useActionState } from "react";
import type { GrowFormState } from "@/lib/grows/actions";
import type {
  GrowEnvironment,
  LightType,
  PlantType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";
import { PLANT_TYPES } from "@/lib/grows/cycle";
import {
  SUBSTRATES,
  ENVIRONMENTS,
  LIGHT_TYPES,
  VARIETIES,
} from "@/lib/grows/attributes";

const inputClass = "rounded-lg border border-[color:var(--border)] px-3 py-2";

export interface GrowDefaults {
  id?: string;
  name?: string;
  genetics?: string;
  plant_type?: PlantType;
  variety?: Variety | null;
  substrate?: SubstrateType;
  environment?: GrowEnvironment;
  light_type?: LightType | null;
  light_schedule?: string | null;
  space_id?: string | null;
  start_date?: string;
}

type GrowAction = (
  prev: GrowFormState,
  formData: FormData
) => Promise<GrowFormState>;

// Form reusable para crear o editar un cultivo. En modo edición se oculta el
// volumen de maceta (se ajusta con logs de trasplante) y se envía grow_id.
export function GrowForm({
  action,
  spaces,
  defaults,
  submitLabel,
  isEdit = false,
}: {
  action: GrowAction;
  spaces: { id: string; name: string }[];
  defaults?: GrowDefaults;
  submitLabel: string;
  isEdit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const d = defaults ?? {};

  return (
    <form
      action={formAction}
      className="flex max-w-md flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm"
    >
      {isEdit && d.id && <input type="hidden" name="grow_id" value={d.id} />}

      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input name="name" required defaultValue={d.name ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Genética
        <input name="genetics" required defaultValue={d.genetics ?? ""} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Tipo de planta
          <select name="plant_type" required defaultValue={d.plant_type ?? "fotoperiodica"} className={inputClass}>
            {PLANT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Variedad (opcional)
          <select name="variety" defaultValue={d.variety ?? ""} className={inputClass}>
            <option value="">—</option>
            {VARIETIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className="-mt-2 text-xs text-neutral-500">
        Las automáticas no se trasplantan. Las sativas estiran más y necesitan
        más altura.
      </span>

      <label className="flex flex-col gap-1 text-sm">
        Sustrato
        <select name="substrate" required defaultValue={d.substrate ?? "tierra"} className={inputClass}>
          {SUBSTRATES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Ambiente
          <select name="environment" required defaultValue={d.environment ?? "interior"} className={inputClass}>
            {ENVIRONMENTS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tipo de luz (opcional)
          <select name="light_type" defaultValue={d.light_type ?? ""} className={inputClass}>
            <option value="">—</option>
            {LIGHT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Fotoperíodo / horas de luz (opcional)
        <input
          name="light_schedule"
          placeholder="ej: 18/6, 12/12, 20/4"
          defaultValue={d.light_schedule ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Espacio / indoor (opcional)
        <select name="space_id" defaultValue={d.space_id ?? ""} className={inputClass}>
          <option value="">Ninguno</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Fecha de inicio
        <input name="start_date" type="date" required defaultValue={d.start_date ?? ""} className={inputClass} />
      </label>

      {!isEdit && (
        <label className="flex flex-col gap-1 text-sm">
          Volumen inicial de maceta (litros)
          <input
            name="initial_pot_volume_l"
            type="number"
            step="0.1"
            min="0.1"
            required
            className={inputClass}
          />
        </label>
      )}

      {isEdit && (
        <p className="text-xs text-neutral-500">
          El volumen de maceta se ajusta con logs de trasplante, no desde acá.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="rounded-full bg-green-700 px-4 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
