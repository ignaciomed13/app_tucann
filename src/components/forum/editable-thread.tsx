"use client";

import { useActionState, useState } from "react";
import { updateThread } from "@/lib/forum/actions";
import { FORUM_CATEGORIES } from "@/lib/forum/categories";
import { FormattedBody } from "@/components/forum/formatted-body";
import { RichTextEditor } from "@/components/forum/rich-text-editor";

// Cabecera del tema con edición inline. En modo vista muestra título + cuerpo
// (con formato) y, si sos el autor, un botón "Editar". En modo edición muestra
// el formulario. La RLS del server action es la que realmente autoriza.
export function EditableThread({
  id,
  title,
  body,
  category,
  isOwner,
}: {
  id: string;
  title: string;
  body: string;
  category: string;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateThread, undefined);

  if (!editing) {
    return (
      <>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-full border border-green-700 px-3 py-1 text-xs font-bold text-green-800 transition hover:bg-green-50"
            >
              ✏️ Editar
            </button>
          )}
        </div>
        <FormattedBody text={body} className="mt-4 text-[color:var(--ink)]" />
      </>
    );
  }

  return (
    <form action={action} className="mt-2 flex flex-col gap-3">
      <input type="hidden" name="thread_id" value={id} />
      <select
        name="category"
        required
        defaultValue={category}
        className="rounded-lg border border-[color:var(--border)] bg-white px-3 py-2.5"
      >
        {FORUM_CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.emoji} {c.name}
          </option>
        ))}
      </select>
      <input
        name="title"
        defaultValue={title}
        required
        maxLength={140}
        className="rounded-lg border border-[color:var(--border)] px-3 py-2.5 font-bold"
      />
      <RichTextEditor name="body" defaultValue={body} rows={8} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-green-700 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-[color:var(--border)] px-5 py-2.5 font-bold text-[color:var(--ink)] transition hover:bg-black/5"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
