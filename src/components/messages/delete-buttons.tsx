"use client";

import { useActionState, useState } from "react";
import type { MessageState } from "@/lib/messages/actions";
import { deleteConversation, deleteMessage } from "@/lib/messages/actions";

// Borrar es unilateral: oculta la copia propia y deja intacta la del otro. Los
// dos botones lo dicen explícito en la confirmación para que nadie crea que
// borró la conversación "de los dos".

// Conversación entera. Confirmación en dos pasos, como en el foro.
export function DeleteConversationButton({ otherId }: { otherId: string }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(
    deleteConversation,
    undefined
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="other_id" value={otherId} />

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          🗑️ Borrar conversación
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-red-700">
            Se borra solo de tu bandeja; la otra persona sigue viéndola.
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

// Mensaje suelto: va dentro del globo, al lado de la hora, así que necesita
// chrome mucho más chico y dos paletas (globo verde propio vs. globo blanco).
export function DeleteMessageButton({
  messageId,
  mine,
}: {
  messageId: string;
  mine: boolean;
}) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(
    deleteMessage,
    undefined
  );
  const [confirming, setConfirming] = useState(false);

  const quiet = mine
    ? "text-green-100 hover:text-white"
    : "text-[color:var(--faint)] hover:text-red-700";

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="message_id" value={messageId} />

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Borrar este mensaje"
          className={`text-[11px] font-bold transition ${quiet}`}
        >
          🗑️
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[11px] font-medium ${
              mine ? "text-green-100" : "text-[color:var(--muted)]"
            }`}
          >
            ¿Borrar solo para vos?
          </span>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "…" : "Sí"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              mine
                ? "bg-green-800 text-green-100 hover:bg-green-900"
                : "border border-[color:var(--border)] text-[color:var(--ink)] hover:bg-black/5"
            }`}
          >
            No
          </button>
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
    </form>
  );
}
