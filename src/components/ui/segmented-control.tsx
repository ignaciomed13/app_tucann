"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui/field";

export interface Option {
  value: string;
  label: string;
}

/**
 * Reemplazo visual de un <select> de pocas opciones. Es puramente de
 * presentación: mantiene el valor en un <input type="hidden"> con el mismo
 * `name`, así las server actions siguen recibiendo el form igual que antes.
 */
export function SegmentedControl({
  name,
  label,
  options,
  defaultValue,
  onChange,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function select(next: string) {
    setValue(next);
    onChange?.(next);
  }

  // Flechas para moverse entre opciones, como un radiogroup nativo.
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    select(next.value);
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-2 flex rounded-[11px] bg-[color:var(--background)] p-[3px]"
      >
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(o.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`flex-1 rounded-[9px] px-2 py-2.5 text-[13px] transition ${
                active
                  ? "bg-green-700 font-bold text-white shadow-sm"
                  : "font-semibold text-[color:var(--muted)] hover:text-[color:var(--ink)]"
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
