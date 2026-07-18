"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitPartner } from "@/lib/partners/actions";
import { PARTNER_CATEGORIES } from "@/lib/partners/submissions";

const inputClass =
  "rounded-lg border border-[color:var(--border)] px-3 py-2.5 text-sm";

export function SuggestPartnerForm() {
  const [state, formAction, pending] = useActionState(
    submitPartner,
    undefined
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Al enviar con éxito, limpiar el formulario para permitir otra sugerencia.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">¿Conocés un growshop de confianza?</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-green-700 px-3 py-1 text-xs font-bold text-green-800 transition hover:bg-green-50"
        >
          {open ? "Cerrar" : "Sugerir uno"}
        </button>
      </div>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Recomendá comercios que te sirvieron. Los revisamos a mano antes de
        publicarlos.
      </p>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Nombre *
              <input name="name" required maxLength={120} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Categoría *
              <select name="category" required defaultValue="growshop" className={inputClass}>
                {PARTNER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Ciudad
              <input name="city" maxLength={80} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Provincia
              <input name="province" maxLength={80} className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sitio web o redes
            <input
              name="url"
              placeholder="ej: instagram.com/growshop"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            ¿Por qué lo recomendás? (opcional)
            <textarea name="description" rows={2} maxLength={400} className={inputClass} />
          </label>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200">
              {state.success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar sugerencia"}
          </button>
        </form>
      )}
    </section>
  );
}
