"use client";

import { useActionState, useState } from "react";
import {
  createPlant,
  updatePlant,
  deletePlant,
  type PlantFormState,
} from "@/lib/plants/actions";

export interface PlantRow {
  id: string;
  label: string;
  notes: string | null;
}

const inputClass = "rounded border border-neutral-300 px-3 py-2 text-sm";

/**
 * Gestión de plantas individuales del cultivo (fenotipos livianos). Nombrar
 * plantas es opcional; sirve para seguir individuos que se comportan distinto
 * (fenohunting). Va plegada por defecto para no recargar la ficha del lote.
 */
export function PlantsManager({
  growId,
  plants,
}: {
  growId: string;
  plants: PlantRow[];
}) {
  const [open, setOpen] = useState(plants.length > 0);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <h2 className="flex items-center gap-2 text-lg font-bold">
          🌱 Plantas / fenotipos
          {plants.length > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
              {plants.length}
            </span>
          )}
        </h2>
        <span className="text-sm text-[color:var(--muted)]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[color:var(--muted)]">
            Nombrá plantas puntuales para seguir comportamientos distintos dentro
            del lote (útil para fenohunting). Después podés asignar logs y cosecha
            a una planta específica.
          </p>

          {plants.length > 0 && (
            <ul className="flex flex-col gap-2">
              {plants.map((p) => (
                <PlantItem key={p.id} growId={growId} plant={p} />
              ))}
            </ul>
          )}

          <AddPlantForm growId={growId} />
        </div>
      )}
    </section>
  );
}

function AddPlantForm({ growId }: { growId: string }) {
  const [state, formAction, pending] = useActionState<PlantFormState, FormData>(
    createPlant,
    undefined
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-[color:var(--border)] p-3"
    >
      <input type="hidden" name="grow_id" value={growId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
        <input
          name="label"
          required
          placeholder="Etiqueta (ej. A1)"
          className={`${inputClass} sm:w-32`}
        />
        <input
          name="notes"
          placeholder="Notas de fenotipo (aroma, estructura, resina…)"
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-green-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Agregando…" : "+ Agregar planta"}
      </button>
    </form>
  );
}

function PlantItem({ growId, plant }: { growId: string; plant: PlantRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlantFormState, FormData>(
    async (prev, formData) => {
      const result = await updatePlant(prev, formData);
      if (result === undefined) setEditing(false);
      return result;
    },
    undefined
  );

  if (editing) {
    return (
      <li>
        <form
          action={formAction}
          className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] p-3"
        >
          <input type="hidden" name="plant_id" value={plant.id} />
          <input type="hidden" name="grow_id" value={growId} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
            <input
              name="label"
              required
              defaultValue={plant.label}
              className={`${inputClass} sm:w-32`}
            />
            <input
              name="notes"
              defaultValue={plant.notes ?? ""}
              placeholder="Notas de fenotipo"
              className={inputClass}
            />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-green-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-bold text-[color:var(--muted)] transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--border)] px-3 py-2">
      <div>
        <p className="text-sm font-bold text-green-800">{plant.label}</p>
        {plant.notes && (
          <p className="text-sm text-[color:var(--ink)]">{plant.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-green-700 hover:underline"
        >
          Editar
        </button>
        <form action={deletePlant}>
          <input type="hidden" name="plant_id" value={plant.id} />
          <input type="hidden" name="grow_id" value={growId} />
          <button
            type="submit"
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Borrar
          </button>
        </form>
      </div>
    </li>
  );
}
