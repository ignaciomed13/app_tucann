"use client";

import { useActionState } from "react";
import { createSpace } from "@/lib/spaces/actions";

const inputClass = "rounded-lg border border-[color:var(--border)] px-3 py-2";

export function NewSpaceForm() {
  const [state, formAction, pending] = useActionState(createSpace, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold">➕ Nuevo espacio</h2>

      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="name"
          required
          placeholder="ej: Carpa 100×100"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Ancho (cm)
          <input name="width_cm" type="number" step="1" min="1" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Profundidad (cm)
          <input name="depth_cm" type="number" step="1" min="1" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Alto (cm, opc.)
          <input name="height_cm" type="number" step="1" min="1" className={inputClass} />
        </label>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear espacio"}
      </button>
    </form>
  );
}
