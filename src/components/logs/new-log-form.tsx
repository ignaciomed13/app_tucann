"use client";

import { useActionState, useState } from "react";
import type { LogType, SubstrateType } from "@/lib/supabase/database.types";
import { createLog } from "@/lib/logs/actions";
import { LOG_TYPES } from "@/lib/logs/validation";
import { LogTypeFields } from "@/components/logs/log-fields";

export function NewLogForm({
  growId,
  currentPotVolumeL,
  substrate,
}: {
  growId: string;
  currentPotVolumeL: number;
  substrate: SubstrateType;
}) {
  const [type, setType] = useState<LogType>("environmental");
  const [state, formAction, pending] = useActionState(createLog, undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded border border-neutral-200 p-4"
    >
      <h2 className="font-medium">Nuevo log</h2>

      <input type="hidden" name="grow_id" value={growId} />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as LogType)}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            {LOG_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fecha
          <input
            name="log_date"
            type="date"
            required
            defaultValue={today}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
      </div>

      {/* key fuerza remount al cambiar de tipo para descartar valores previos */}
      <div key={type}>
        <LogTypeFields
          type={type}
          currentPotVolumeL={currentPotVolumeL}
          substrate={substrate}
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-700">Log guardado.</p>
      )}

      <button
        disabled={pending}
        type="submit"
        className="self-start rounded bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar log"}
      </button>
    </form>
  );
}
