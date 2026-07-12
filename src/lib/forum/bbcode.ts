// Formato de mensajes del foro con BBCode (estilo foro clásico: [b], [size=...],
// [color=...], [font=...]). CLAVE DE SEGURIDAD: el foro es compartido entre
// miembros, así que NUNCA guardamos ni renderizamos HTML del usuario. Este
// módulo parsea el texto a un árbol de datos (AST) con estilos tomados SIEMPRE
// de listas blancas fijas; después <FormattedBody> lo pinta como nodos de React
// (que escapa el texto solo). Resultado: imposible inyectar scripts ni CSS.
import type { CSSProperties } from "react";

// Listas blancas: los únicos valores que un mensaje puede pedir. La barra de
// formato del editor ofrece exactamente estas claves.
export const BBCODE_FONTS = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'Courier New', monospace",
} as const;

export const BBCODE_SIZES = {
  chico: "0.85em",
  normal: "1em",
  grande: "1.3em",
  enorme: "1.7em",
} as const;

export const BBCODE_COLORS = {
  verde: "#15803d",
  rojo: "#b91c1c",
  naranja: "#c2410c",
  azul: "#1d4ed8",
  violeta: "#7c3aed",
  gris: "#6b7280",
} as const;

// Además de los nombres de arriba, [color=...] acepta un hex validado.
const HEX_RE = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;

export type BBTag = "b" | "i" | "u" | "s" | "size" | "color" | "font";

// El valor nunca cruza saltos de línea ni corchetes: así un "[" suelto no se
// come medio mensaje.
const TAG_RE = /\[(\/?)(b|i|u|s|size|color|font)(?:=([^\]\n]+))?\]/gi;

export type BBNode = string | BBElement;
export interface BBElement {
  tag: BBTag;
  value?: string;
  style: CSSProperties | null;
  children: BBNode[];
}

// Traduce (tag, valor) a un estilo seguro, o null si el valor no está en la
// lista blanca (en ese caso el texto se muestra igual, sin formato).
function styleFor(tag: BBTag, value: string | undefined): CSSProperties | null {
  switch (tag) {
    case "b":
      return { fontWeight: 700 };
    case "i":
      return { fontStyle: "italic" };
    case "u":
      return { textDecoration: "underline" };
    case "s":
      return { textDecoration: "line-through" };
    case "size": {
      const v = (value ?? "").toLowerCase();
      return v in BBCODE_SIZES
        ? { fontSize: BBCODE_SIZES[v as keyof typeof BBCODE_SIZES] }
        : null;
    }
    case "font": {
      const v = (value ?? "").toLowerCase();
      return v in BBCODE_FONTS
        ? { fontFamily: BBCODE_FONTS[v as keyof typeof BBCODE_FONTS] }
        : null;
    }
    case "color": {
      const raw = value ?? "";
      const v = raw.toLowerCase();
      if (v in BBCODE_COLORS)
        return { color: BBCODE_COLORS[v as keyof typeof BBCODE_COLORS] };
      if (HEX_RE.test(raw)) return { color: raw };
      return null;
    }
  }
}

interface Frame {
  tag: BBTag;
  value?: string;
  children: BBNode[];
}

// Parsea el texto a un árbol. Etiquetas mal cerradas se autocierran al final;
// un cierre sin apertura queda como texto literal. Nunca tira: cualquier
// entrada produce un árbol válido.
export function parseBBCode(input: string): BBNode[] {
  const root: BBNode[] = [];
  const stack: Frame[] = [];
  const top = (): BBNode[] =>
    stack.length ? stack[stack.length - 1].children : root;

  const closeFrame = (f: Frame) => {
    top().push({
      tag: f.tag,
      value: f.value,
      style: styleFor(f.tag, f.value),
      children: f.children,
    });
  };

  let last = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(input)) !== null) {
    const [match, slash, rawTag, value] = m;
    const text = input.slice(last, m.index);
    if (text) top().push(text);
    last = m.index + match.length;

    const tag = rawTag.toLowerCase() as BBTag;
    if (!slash) {
      stack.push({ tag, value, children: [] });
    } else {
      // Buscá la apertura correspondiente más cercana al tope.
      let matchIdx = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          matchIdx = i;
          break;
        }
      }
      if (matchIdx === -1) {
        top().push(match); // cierre huérfano → literal
      } else {
        // Cerrá cualquier etiqueta interna sin cerrar y después la que matchea.
        while (stack.length - 1 > matchIdx) closeFrame(stack.pop()!);
        closeFrame(stack.pop()!);
      }
    }
  }
  const tail = input.slice(last);
  if (tail) top().push(tail);
  while (stack.length) closeFrame(stack.pop()!);
  return root;
}
