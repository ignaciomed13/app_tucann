"use client";

import { useActionState, useState } from "react";
import { deletePost, updatePost } from "@/lib/forum/actions";
import { FormattedBody } from "@/components/forum/formatted-body";
import { RichTextEditor } from "@/components/forum/rich-text-editor";
import { DmLink } from "@/components/forum/dm-link";
import { DeleteButton } from "@/components/forum/delete-button";

// Una respuesta del hilo con edición inline para su autor.
export function EditablePost({
  id,
  threadId,
  body,
  authorId,
  authorAlias,
  myId,
  meta,
  isOwner,
}: {
  id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorAlias: string;
  myId: string;
  meta: string; // fecha ya formateada + "· editado" si corresponde
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updatePost, undefined);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <p className="flex flex-wrap items-center gap-x-1 text-xs text-[color:var(--muted)]">
        <span>
          {authorAlias} · {meta}
        </span>
        <DmLink authorId={authorId} alias={authorAlias} myId={myId} />
        {isOwner && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-2 rounded-full border border-green-700 px-2 py-0.5 text-[11px] font-bold text-green-800 transition hover:bg-green-50"
          >
            ✏️ Editar
          </button>
        )}
      </p>

      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="post_id" value={id} />
          <input type="hidden" name="thread_id" value={threadId} />
          <RichTextEditor name="body" defaultValue={body} rows={4} />
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {state.error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={pending}
              type="submit"
              className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-bold text-[color:var(--ink)] transition hover:bg-black/5"
            >
              Cancelar
            </button>
          </div>
        </form>
        <DeleteButton
          action={deletePost}
          hidden={{ post_id: id, thread_id: threadId }}
          label="Eliminar respuesta"
          warning="Se borra esta respuesta. No se puede deshacer."
        />
        </div>
      ) : (
        <FormattedBody text={body} className="mt-2 text-[color:var(--ink)]" />
      )}
    </div>
  );
}
