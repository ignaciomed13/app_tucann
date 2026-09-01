"use client";

import { useActionState, useState } from "react";
import type { GrowFormState } from "@/lib/grows/actions";
import type {
  GrowEnvironment,
  LightType,
  PlantOrigin,
  PlantType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";
import { canBeCutting, PLANT_ORIGINS, PLANT_TYPES } from "@/lib/grows/cycle";
import {
  SUBSTRATES,
  ENVIRONMENTS,
  LIGHT_TYPES,
  VARIETIES_SHORT,
} from "@/lib/grows/attributes";
import { Field, FormSection, fieldInputClass } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ChipGroup } from "@/components/ui/chip-group";
import { Stepper } from "@/components/ui/stepper";
import { GeneticsInfoField } from "@/components/grows/genetics-info-field";

export interface GrowDefaults {
  id?: string;
  name?: string;
  genetics?: string;
  genetics_info?: string | null;
  genetics_doc_path?: string | null;
  plant_type?: PlantType;
  origin?: PlantOrigin;
  variety?: Variety | null;
  plant_count?: number;
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

/**
 * Form reusable para crear o editar un cultivo, en 3 secciones numeradas.
 *
 * Los selectores segmentados / chips / stepper son puramente de presentación:
 * cada uno sincroniza un <input type="hidden"> con el mismo `name` que usaba el
 * <select> original, así `createGrow` / `updateGrow` reciben el mismo FormData.
 *
 * En modo edición se oculta el volumen de maceta (se ajusta con logs de
 * trasplante) y se envía grow_id.
 *
 * Tipo de planta y origen están atados: las autofloreciente no se clonan, así
 * que al elegir "Autofloreciente" el origen vuelve a semilla y el selector
 * desaparece (el server valida lo mismo en parseGrowFields).
 *
 * El nombre de la genética es controlado porque la ficha de abajo lo usa como
 * pista al leer una imagen o un PDF del banco.
 */
export function GrowForm({
  action,
  spaces,
  userId,
  defaults,
  submitLabel,
  isEdit = false,
}: {
  action: GrowAction;
  spaces: { id: string; name: string }[];
  userId: string;
  defaults?: GrowDefaults;
  submitLabel: string;
  isEdit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const d = defaults ?? {};
  const [genetics, setGenetics] = useState(d.genetics ?? "");
  const [plantType, setPlantType] = useState<PlantType>(
    d.plant_type ?? "fotoperiodica"
  );
  const [origin, setOrigin] = useState<PlantOrigin>(d.origin ?? "semilla");
  const cuttingAllowed = canBeCutting(plantType);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {isEdit && d.id && <input type="hidden" name="grow_id" value={d.id} />}

      <FormSection step={1} title="Identidad">
        <Field label="Nombre">
          <input
            name="name"
            required
            defaultValue={d.name ?? ""}
            className={fieldInputClass}
          />
        </Field>
        <Field label="Genética">
          <input
            name="genetics"
            required
            value={genetics}
            onChange={(e) => setGenetics(e.target.value)}
            className={fieldInputClass}
          />
        </Field>

        <GeneticsInfoField
          userId={userId}
          genetics={genetics}
          defaultValue={d.genetics_info ?? ""}
          defaultDocPath={d.genetics_doc_path ?? ""}
        />
      </FormSection>

      <FormSection step={2} title="Ciclo">
        <SegmentedControl
          name="plant_type"
          label="Tipo de planta"
          options={PLANT_TYPES}
          defaultValue={plantType}
          onChange={(v) => {
            const next = v as PlantType;
            setPlantType(next);
            if (!canBeCutting(next)) setOrigin("semilla");
          }}
        />

        {cuttingAllowed ? (
          <>
            {/* key: al volver de auto a fotoperiódica el control se remonta con
                el origen ya reseteado a semilla. */}
            <SegmentedControl
              key={plantType}
              name="origin"
              label="Origen"
              options={PLANT_ORIGINS}
              defaultValue={origin}
              onChange={(v) => setOrigin(v as PlantOrigin)}
            />
            <span className="-mt-2 text-xs text-[color:var(--faint)]">
              {origin === "esqueje"
                ? "El esqueje no germina: enraíza unas 2 semanas bajo cúpula y llega a cosecha antes que una de semilla. La fecha de inicio es la del corte."
                : "Si arrancás de un clon elegí esqueje: el ciclo es más corto y no pasa por germinación."}
            </span>
          </>
        ) : (
          <>
            <input type="hidden" name="origin" value="semilla" />
            <span className="-mt-1 text-xs text-[color:var(--faint)]">
              Las autoflorecientes no se clonan: el esqueje hereda la edad de la
              madre.
            </span>
          </>
        )}

        <ChipGroup
          name="variety"
          label="Variedad (opcional)"
          options={VARIETIES_SHORT}
          defaultValue={d.variety ?? ""}
          allowEmpty
        />
        <span className="-mt-2 text-xs text-[color:var(--faint)]">
          Las automáticas no se trasplantan. Las sativas estiran más y necesitan
          más altura.
        </span>

        <Stepper
          name="plant_count"
          label="Cantidad de plantas"
          defaultValue={d.plant_count ?? 1}
        />
        <span className="-mt-2 text-xs text-[color:var(--faint)]">
          Un cultivo puede ser un lote de varias plantas iguales (ej. SOG).
        </span>

        <Field label="Fecha de inicio">
          <input
            name="start_date"
            type="date"
            required
            defaultValue={d.start_date ?? ""}
            className={fieldInputClass}
          />
        </Field>
      </FormSection>

      <FormSection step={3} title="Ambiente y maceta">
        <ChipGroup
          name="substrate"
          label="Sustrato"
          options={SUBSTRATES}
          defaultValue={d.substrate ?? "tierra"}
        />

        <SegmentedControl
          name="environment"
          label="Ambiente"
          options={ENVIRONMENTS}
          defaultValue={d.environment ?? "interior"}
        />

        <ChipGroup
          name="light_type"
          label="Tipo de luz (opcional)"
          options={LIGHT_TYPES}
          defaultValue={d.light_type ?? ""}
          allowEmpty
        />

        <Field label="Fotoperíodo / horas de luz (opcional)">
          <input
            name="light_schedule"
            placeholder="ej: 18/6, 12/12, 20/4"
            defaultValue={d.light_schedule ?? ""}
            className={fieldInputClass}
          />
        </Field>

        <Field label="Espacio / indoor (opcional)">
          <select
            name="space_id"
            defaultValue={d.space_id ?? ""}
            className={fieldInputClass}
          >
            <option value="">Ninguno</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {!isEdit && (
          <Field label="Volumen inicial de maceta (litros)">
            <input
              name="initial_pot_volume_l"
              type="number"
              step="0.1"
              min="0.1"
              required
              className={fieldInputClass}
            />
          </Field>
        )}

        {!isEdit && origin === "esqueje" && (
          <span className="-mt-2 text-xs text-[color:var(--faint)]">
            Si todavía está enraizando, cargá el volumen del cubo o vasito;
            cuando lo pases a maceta registralo como log de trasplante.
          </span>
        )}

        {isEdit && (
          <p className="text-xs text-[color:var(--faint)]">
            El volumen de maceta se ajusta con logs de trasplante, no desde acá.
          </p>
        )}
      </FormSection>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      {/* Barra fija: el CTA queda siempre a mano en el celu. */}
      <div className="sticky bottom-0 -mx-5 border-t border-[color:var(--border)] bg-[color:var(--background)]/95 px-5 pb-4 pt-3.5 backdrop-blur">
        <button
          disabled={pending}
          type="submit"
          className="w-full rounded-xl bg-green-700 px-4 py-3.5 text-[15px] font-extrabold text-white shadow-[0_4px_12px_rgba(21,128,61,.3)] transition hover:bg-green-800 disabled:opacity-50"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
