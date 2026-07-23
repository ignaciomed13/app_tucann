import type { ReactNode } from "react";

/** Estilo compartido de los inputs de texto/fecha/número del rediseño. */
export const fieldInputClass =
  "w-full rounded-[10px] border-[1.5px] border-[color:var(--border)] bg-white px-3 py-3 text-[15px] text-[color:var(--ink)]";

/** Label en versalitas verdes usada en las secciones de formulario. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
      {children}
    </span>
  );
}

/** Campo con label arriba e input debajo. */
export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && <span className="text-xs text-[color:var(--faint)]">{hint}</span>}
    </label>
  );
}

/** Sección numerada del formulario: "1 · Identidad" + card blanca. */
export function FormSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.09em] text-green-700">
        {step} · {title}
      </p>
      <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        {children}
      </div>
    </section>
  );
}
