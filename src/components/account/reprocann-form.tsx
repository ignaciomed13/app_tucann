"use client";

import { useActionState } from "react";
import { saveReprocannExpiry } from "@/lib/account/actions";

export function ReprocannForm({
  defaultExpiresOn,
}: {
  defaultExpiresOn: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveReprocannExpiry,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Fecha de vencimiento de tu autorización
        <input
          name="reprocann_expires_on"
          type="date"
          defaultValue={defaultExpiresOn ?? ""}
          className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
        />
      </label>
      <p className="text-xs text-[color:var(--muted)]">
        Figura en tu credencial de REPROCANN. Con las notificaciones activadas,
        Tucu te avisa 30 y 7 días antes y el día del vencimiento. Dejala vacía
        si no querés recibir avisos.
      </p>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200">
          {state.success}
        </p>
      )}
      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
