"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  LogData,
  LogType,
  SubstrateType,
} from "@/lib/supabase/database.types";
import { updateLog } from "@/lib/logs/actions";
import { LOG_TYPE_LABELS } from "@/lib/logs/validation";
import { LogTypeFields } from "@/components/logs/log-fields";

export function EditLogForm({
  growId,
  logId,
  type,
  logDate,
  data,
  currentPotVolumeL,
  substrate,
}: {
  growId: string;
  logId: string;
  type: LogType;
  logDate: string;
  data: LogData;
  currentPotVolumeL: number;
  substrate: SubstrateType;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateLog, undefined);

  useEffect(() => {
    if (state?.success) {
      router.push(`/dashboard/grows/${growId}`);
    }
  }, [state?.success, growId, router]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="log_id" value={logId} />
      <input type="hidden" name="grow_id" value={growId} />
      <input type="hidden" name="type" value={type} />

      <p className="text-sm text-neutral-600">
        Tipo: <span className="font-medium">{LOG_TYPE_LABELS[type]}</span> (no
        editable)
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Fecha
        <input
          name="log_date"
          type="date"
          required
          defaultValue={logDate}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>

      <LogTypeFields
        type={type}
        currentPotVolumeL={currentPotVolumeL}
        substrate={substrate}
        defaults={data as Partial<Record<string, string | number>>}
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        disabled={pending}
        type="submit"
        className="self-start rounded bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
