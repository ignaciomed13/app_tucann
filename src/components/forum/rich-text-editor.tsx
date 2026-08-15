"use client";

import { useEffect, useRef, useState } from "react";
import {
  BBCODE_COLORS,
  BBCODE_FONTS,
  BBCODE_SIZES,
} from "@/lib/forum/bbcode";
import { FormattedBody } from "@/components/forum/formatted-body";

// Menciones: se dispara al escribir "@" al empezar una palabra. El texto que
// sigue puede tener un espacio porque los alias lo admiten ("Juan Perez"); más
// de dos palabras ya no se busca. Si no hay coincidencias la lista se cierra
// sola, así que escribir "@" en medio de una frase no molesta.
const MENTION_QUERY_RE =
  /(?:^|[^a-zA-Z0-9ñÑ._\-@])@([a-zA-Z0-9ñÑ._-]*(?: [a-zA-Z0-9ñÑ._-]*)?)$/;

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

  // Estado del autocompletado de menciones. `start` es la posición del "@" que
  // se está escribiendo: al elegir un alias se reemplaza desde ahí.
  const [mention, setMention] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  // Busca alias mientras se escribe. El contador descarta respuestas que
  // llegan tarde: sin esto, una búsqueda vieja puede pisar a una más nueva.
  const requestId = useRef(0);
  useEffect(() => {
    if (!mention || mention.query.trim().length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/forum/aliases?q=${encodeURIComponent(mention.query)}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data: { aliases?: string[] } = await res.json();
        if (id !== requestId.current) return;
        setSuggestions(data.aliases ?? []);
        setActive(0);
      } catch {
        // Sin red o sin service role: se sigue pudiendo escribir a mano.
        if (id === requestId.current) setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [mention]);

  // Mira el texto que quedó antes del cursor para saber si se está escribiendo
  // una mención. Se llama en cada cambio y cada vez que se mueve el cursor.
  // Cerrar la lista es cosa de acá (el efecto de arriba solo la abre): así el
  // desplegable desaparece apenas deja de haber algo que completar.
  function syncMention(text: string, cursor: number) {
    const m = MENTION_QUERY_RE.exec(text.slice(0, cursor));
    if (!m) {
      setMention(null);
      setSuggestions([]);
      return;
    }
    setMention({ start: cursor - m[1].length - 1, query: m[1] });
    if (m[1].trim().length < 2) setSuggestions([]);
  }

  // Reemplaza lo tipeado por la forma canónica [@alias], que es la que el
  // server resuelve sin ambigüedad y la que se pinta destacada al mostrarse.
  function pickMention(alias: string) {
    const ta = ref.current;
    if (!mention || !ta) return;
    const cursor = ta.selectionStart;
    const inserted = `[@${alias}] `;
    const next = value.slice(0, mention.start) + inserted + value.slice(cursor);
    setValue(next);
    setMention(null);
    setSuggestions([]);
    const caret = mention.start + inserted.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      // Solo se roba el Enter si hay una lista abierta; si no, sigue siendo un
      // salto de línea normal.
      e.preventDefault();
      pickMention(suggestions[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
      setSuggestions([]);
    }
  }

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
        <div className="relative flex flex-col">
          <textarea
            ref={ref}
            name={name}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              syncMention(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={onKeyDown}
            // Si el cursor se va a otro lado, lo que se estaba escribiendo ya
            // no es una mención.
            onSelect={(e) =>
              syncMention(value, e.currentTarget.selectionStart)
            }
            onBlur={() => setSuggestions([])}
            placeholder={placeholder}
            required
            rows={rows}
            className="rounded-lg border border-[color:var(--border)] px-3 py-2.5 font-mono text-sm"
          />
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-[color:var(--border)] bg-white py-1 shadow-lg">
              {suggestions.map((alias, i) => (
                <li key={alias}>
                  <button
                    type="button"
                    // Sin esto el textarea pierde el foco antes del click y la
                    // posición del cursor se vuelve inservible.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMention(alias)}
                    className={`block w-full px-3 py-1.5 text-left text-sm ${
                      i === active
                        ? "bg-green-100 font-bold text-green-900"
                        : "text-[color:var(--ink)] hover:bg-green-50"
                    }`}
                  >
                    @{alias}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-[color:var(--muted)]">
        Seleccioná texto y tocá un botón para darle formato. Se usan códigos tipo{" "}
        <code>[b]…[/b]</code>. Escribí <code>@</code> para mencionar a alguien y
        que le llegue un aviso.
      </p>
    </div>
  );
}
