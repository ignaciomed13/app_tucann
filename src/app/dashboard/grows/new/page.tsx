"use client";

import { useActionState } from "react";
import { createGrow } from "@/lib/grows/actions";
import { PLANT_TYPES } from "@/lib/grows/cycle";
import { SUBSTRATES, ENVIRONMENTS, LIGHT_TYPES } from "@/lib/grows/attributes";

export default function NewGrowPage() {
  const [state, formAction, pending] = useActionState(createGrow, undefined);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Nuevo cultivo</h1>

      <form
        action={formAction}
        className="flex max-w-md flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input
            name="name"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Genética
          <input
            name="genetics"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tipo de planta
          <select
            name="plant_type"
            required
            defaultValue="fotoperiodica"
            className="rounded border border-neutral-300 px-3 py-2"
          >
            {PLANT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-xs text-neutral-500">
            Las automáticas no se trasplantan: van en maceta definitiva desde el
            inicio.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Sustrato
          <select
            name="substrate"
            required
            defaultValue="tierra"
            className="rounded border border-neutral-300 px-3 py-2"
          >
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
            <select
              name="environment"
              required
              defaultValue="interior"
              className="rounded border border-neutral-300 px-3 py-2"
            >
              {ENVIRONMENTS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tipo de luz (opcional)
            <select
              name="light_type"
              defaultValue=""
              className="rounded border border-neutral-300 px-3 py-2"
            >
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
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fecha de inicio
          <input
            name="start_date"
            type="date"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Volumen inicial de maceta (litros)
          <input
            name="initial_pot_volume_l"
            type="number"
            step="0.1"
            min="0.1"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-green-700 px-4 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear cultivo"}
        </button>
      </form>
    </div>
  );
}
