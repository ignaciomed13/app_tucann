"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui/field";
import type { Option } from "@/components/ui/segmented-control";

/**
 * Selección única entre chips, para los <select> con más opciones (variedad,
 * sustrato, tipo de luz). Igual que SegmentedControl, sincroniza un input
 * oculto con el mismo `name` para no tocar las server actions.
 *
 * Con `allowEmpty`, volver a tocar el chip activo lo deselecciona (equivale a
 * la opción "—" del select original).
 */
export function ChipGroup({
  name,
  label,
  options,
  defaultValue = "",
  allowEmpty = false,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string;
  allowEmpty?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-2 flex flex-wrap gap-[7px]"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                setValue(active && allowEmpty ? "" : o.value)
              }
              className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] transition ${
                active
                  ? "border-green-700 bg-green-700 font-bold text-white"
                  : "border-[color:var(--border)] font-semibold text-[color:var(--muted)] hover:border-green-700 hover:text-green-800"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
