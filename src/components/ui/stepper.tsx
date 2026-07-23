"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui/field";

/** +/− para cantidades enteras chicas. Sincroniza un input oculto con `name`. */
export function Stepper({
  name,
  label,
  defaultValue = 1,
  min = 1,
  max = 99,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-[10px] border-[1.5px] text-lg font-bold transition disabled:opacity-40";

  return (
    <div className="flex items-center justify-between gap-3">
      <FieldLabel>{label}</FieldLabel>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label={`Restar a ${label}`}
          disabled={value <= min}
          onClick={() => setValue((v) => Math.max(min, v - 1))}
          className={`${btn} border-[color:var(--border)] text-green-700`}
        >
          −
        </button>
        <span
          aria-live="polite"
          className="min-w-[24px] text-center text-[17px] font-extrabold"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`Sumar a ${label}`}
          disabled={value >= max}
          onClick={() => setValue((v) => Math.min(max, v + 1))}
          className={`${btn} border-green-700 bg-green-700 text-white`}
        >
          +
        </button>
      </div>
    </div>
  );
}
