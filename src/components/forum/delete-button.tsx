"use client";

import { useActionState, useState } from "react";
import type { ForumState } from "@/lib/forum/actions";

// Botón de borrar con confirmación en dos pasos: el primer clic pide confirmar,
// así nadie borra un tema o respuesta sin querer. Vive en su propio <form> (no
// puede anidarse dentro del form de edición: forms anidados no son HTML válido).
export function DeleteButton({
  action,
  hidden,
  label,
  warning,
}: {
  action: (prev: ForumState, formData: FormData) => Promise<ForumState>;
  hidden: Record<string, string>;
  label: string;
  warning?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          🗑️ {label}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-red-700">
            {warning ?? "¿Seguro? No se puede deshacer."}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-bold text-[color:var(--ink)] transition hover:bg-black/5"
          >
            No
          </button>
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
    </form>
  );
}
