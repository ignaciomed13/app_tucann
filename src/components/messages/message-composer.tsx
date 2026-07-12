"use client";

import { useActionState } from "react";
import { sendMessage } from "@/lib/messages/actions";

export function MessageComposer({ recipientId }: { recipientId: string }) {
  const [state, action, pending] = useActionState(sendMessage, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="recipient_id" value={recipientId} />
      <textarea
        name="body"
        placeholder="Escribí tu mensaje…"
        required
        rows={3}
        maxLength={4000}
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
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
