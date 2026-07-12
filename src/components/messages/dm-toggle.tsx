"use client";

import { setDmEnabled } from "@/lib/messages/actions";

export function DmToggle({ enabled }: { enabled: boolean }) {
  return (
    <form action={setDmEnabled} className="flex items-center gap-3">
      {/* Enviamos el valor OPUESTO al actual: el botón alterna el estado. */}
      <input type="hidden" name="enabled" value={(!enabled).toString()} />
      <span className="text-sm text-[color:var(--muted)]">
        Mensajes privados:{" "}
        <strong className="text-[color:var(--ink)]">
          {enabled ? "activados" : "desactivados"}
        </strong>
      </span>
      <button
        type="submit"
        className="rounded-full border-2 border-green-700 px-4 py-1.5 text-sm font-bold text-green-800 transition hover:bg-green-50"
      >
        {enabled ? "Desactivar" : "Activar"}
      </button>
    </form>
  );
}
