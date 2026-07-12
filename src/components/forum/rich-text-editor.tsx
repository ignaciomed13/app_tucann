"use client";

import { useRef, useState } from "react";
import {
  BBCODE_COLORS,
  BBCODE_FONTS,
  BBCODE_SIZES,
} from "@/lib/forum/bbcode";
import { FormattedBody } from "@/components/forum/formatted-body";

const FONT_LABELS: Record<keyof typeof BBCODE_FONTS, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Monoespaciada",
};
const SIZE_LABELS: Record<keyof typeof BBCODE_SIZES, string> = {
  chico: "Chico",
  normal: "Normal",
  grande: "Grande",
  enorme: "Enorme",
};

// Editor de texto con barra de formato. Escribe BBCode en un textarea normal
// (controlado), así el server action lee el valor por su `name` sin nada raro.
export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  rows = 5,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Envuelve la selección actual con [open]…[close]. Si no hay selección,
  // inserta las etiquetas y deja el cursor en el medio.
  function surround(open: string, close: string) {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const next =
      value.slice(0, start) +
      open +
      value.slice(start, end) +
      close +
      value.slice(end);
    setValue(next);
    // Reponer el foco y dejar seleccionado el texto envuelto.
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start + open.length, end + open.length);
    });
  }

  const btn =
    "rounded-md border border-[color:var(--border)] bg-white px-2.5 py-1 text-sm font-bold text-[color:var(--ink)] transition hover:bg-green-50";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={btn}
          onClick={() => surround("[b]", "[/b]")}
          title="Negrita"
        >
          <span className="font-extrabold">N</span>
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => surround("[i]", "[/i]")}
          title="Cursiva"
        >
          <span className="italic">K</span>
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => surround("[u]", "[/u]")}
          title="Subrayado"
        >
          <span className="underline">S</span>
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => surround("[s]", "[/s]")}
          title="Tachado"
        >
          <span className="line-through">T</span>
        </button>

        <select
          aria-label="Tamaño de letra"
          className={btn}
          value=""
          onChange={(e) => {
            if (e.target.value) surround(`[size=${e.target.value}]`, "[/size]");
            e.target.value = "";
          }}
        >
          <option value="">Tamaño</option>
          {(Object.keys(BBCODE_SIZES) as (keyof typeof BBCODE_SIZES)[]).map(
            (k) => (
              <option key={k} value={k}>
                {SIZE_LABELS[k]}
              </option>
            )
          )}
        </select>

        <select
          aria-label="Fuente"
          className={btn}
          value=""
          onChange={(e) => {
            if (e.target.value) surround(`[font=${e.target.value}]`, "[/font]");
            e.target.value = "";
          }}
        >
          <option value="">Fuente</option>
          {(Object.keys(BBCODE_FONTS) as (keyof typeof BBCODE_FONTS)[]).map(
            (k) => (
              <option key={k} value={k}>
                {FONT_LABELS[k]}
              </option>
            )
          )}
        </select>

        <span className="mx-1 flex items-center gap-1">
          {(Object.keys(BBCODE_COLORS) as (keyof typeof BBCODE_COLORS)[]).map(
            (k) => (
              <button
                key={k}
                type="button"
                title={`Color ${k}`}
                onClick={() => surround(`[color=${k}]`, "[/color]")}
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: BBCODE_COLORS[k] }}
              />
            )
          )}
        </span>

        <button
          type="button"
          className={`${btn} ml-auto`}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? "✏️ Escribir" : "👁️ Vista previa"}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[6rem] rounded-lg border border-[color:var(--border)] bg-white px-3 py-2.5 text-[color:var(--ink)]">
          {value.trim() ? (
            <FormattedBody text={value} />
          ) : (
            <span className="text-sm text-[color:var(--muted)]">
              Nada para previsualizar todavía.
            </span>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          required
          rows={rows}
          className="rounded-lg border border-[color:var(--border)] px-3 py-2.5 font-mono text-sm"
        />
      )}

      <p className="text-xs text-[color:var(--muted)]">
        Seleccioná texto y tocá un botón para darle formato. Se usan códigos tipo{" "}
        <code>[b]…[/b]</code>.
      </p>
    </div>
  );
}
