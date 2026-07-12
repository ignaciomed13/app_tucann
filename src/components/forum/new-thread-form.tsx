"use client";

import { useActionState } from "react";
import { createThread } from "@/lib/forum/actions";

export function NewThreadForm() {
  const [state, action, pending] = useActionState(createThread, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="title"
        placeholder="Título del tema"
        required
        maxLength={140}
        className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
      />
      <textarea
        name="body"
        placeholder="Escribí tu consulta o experiencia…"
        required
        rows={4}
        className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-green-700 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Publicando…" : "Publicar tema"}
      </button>
    </form>
  );
}
