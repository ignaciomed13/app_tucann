"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/lib/account/actions";

// Borrado de cuenta con confirmación reforzada: dos pasos (como el
// DeleteButton del foro) más tipear BORRAR, porque acá no hay vuelta atrás.
export function DeleteAccount() {
  const [state, formAction, pending] = useActionState(deleteAccount, undefined);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const ready = confirmText.trim().toUpperCase() === "BORRAR";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="self-start rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
      >
        🗑️ Borrar mi cuenta
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
        <p className="font-bold">Esto borra todo y no se puede deshacer:</p>
        <ul className="mt-1 list-inside list-disc">
          <li>tus cultivos, logs, fotos y análisis de Tucu</li>
          <li>tus espacios, plantas y ajustes (fecha REPROCANN incluida)</li>
          <li>tus mensajes privados (se borran para ambas partes)</li>
        </ul>
        <p className="mt-2">
          Tus temas y respuestas del foro <strong>no se borran</strong>: quedan
          publicados bajo tu alias, sin ninguna conexión con tu cuenta. Si
          querés que tampoco quede eso, borralos a mano antes de borrar la
          cuenta.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Escribí <span className="font-mono font-bold">BORRAR</span> para
        confirmar
        <input
          name="confirm_text"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          className="rounded-lg border border-red-300 px-3 py-2.5"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || !ready}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Borrando…" : "Borrar mi cuenta para siempre"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setConfirmText("");
          }}
          className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-bold text-[color:var(--ink)] transition hover:bg-black/5"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
