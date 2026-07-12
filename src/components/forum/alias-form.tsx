"use client";

import { useActionState } from "react";
import { setForumAlias } from "@/lib/forum/actions";

export function AliasForm({ defaultAlias }: { defaultAlias: string | null }) {
  const [state, action, pending] = useActionState(setForumAlias, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="alias"
          defaultValue={defaultAlias ?? ""}
          placeholder="ej. GrowerDelSur"
          required
          maxLength={24}
          className="rounded-lg border border-[color:var(--border)] px-3 py-2.5 sm:flex-1"
        />
        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-green-700 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
        >
          {pending
            ? "Guardando…"
            : defaultAlias
              ? "Cambiar alias"
              : "Elegir alias"}
        </button>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
    </form>
  );
}
