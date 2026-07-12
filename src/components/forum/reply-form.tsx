"use client";

import { useActionState } from "react";
import { createPost } from "@/lib/forum/actions";
import { RichTextEditor } from "@/components/forum/rich-text-editor";

export function ReplyForm({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState(createPost, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="thread_id" value={threadId} />
      <RichTextEditor name="body" placeholder="Escribí tu respuesta…" rows={3} />
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
        {pending ? "Enviando…" : "Responder"}
      </button>
    </form>
  );
}
