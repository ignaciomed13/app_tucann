// Menciones del foro: "@alias" dentro del cuerpo de un tema o una respuesta.
// Este módulo es PURO — solo saca del texto los alias *candidatos*. Quién
// existe de verdad lo decide el server contra user_settings (ver
// src/lib/forum/notify.ts), porque acá no hay forma de saberlo.
//
// Hay dos formas de escribir una mención, y las dos se aceptan:
//
//   [@Juan Perez]  forma canónica: la inserta el autocompletado del editor.
//                  No tiene ambigüedad, así que también es la única que se
//                  pinta destacada al renderizar (ver bbcode.ts).
//   @Juan Perez    forma suelta: la escribe a mano quien no usa la lista.
//
// La forma suelta es ambigua porque un alias puede tener espacios ("Juan
// Perez" es válido): al leer "@Juan Perez dijo algo" no hay manera de saber
// dónde termina el alias. Por eso se generan los candidatos de cada corte
// posible en límite de palabra ("juan", "juan perez", "juan perez dijo") y el
// server se queda con el match más largo que exista de verdad.

// Mismo juego de caracteres que ALIAS_RE en forum/actions.ts, sin el espacio:
// acá el espacio se maneja aparte porque es el separador de palabras.
const ALIAS_WORD = "[a-zA-Z0-9ñÑ._\\-]";
const MAX_ALIAS_LEN = 24;

// Copia de ALIAS_RE (forum/actions.ts): la forma que un alias puede tener.
// Todo candidato pasa por acá antes de salir del módulo. Además de descartar
// ruido, esto es lo que garantiza que un candidato no pueda llevar comillas,
// comas ni llaves a la consulta que después lo busca en la base.
const ALIAS_SHAPE = /^[a-zA-Z0-9ñÑ._\- ]{3,24}$/;

export function isPossibleAlias(candidate: string): boolean {
  return ALIAS_SHAPE.test(candidate);
}

// Forma canónica. El alias no puede tener "]" ni saltos de línea, igual que
// los valores de las etiquetas de BBCode.
const BRACKETED_RE = /\[@([^\]\n]{1,24})\]/g;

// Forma suelta: un "@" que arranca palabra, seguido de hasta 4 palabras. El
// tope de palabras existe para no generar candidatos infinitos en un párrafo
// largo; 24 caracteres de alias no dan para más.
const LOOSE_RE = new RegExp(
  `(^|[^a-zA-Z0-9ñÑ._\\-@])@(${ALIAS_WORD}+(?: ${ALIAS_WORD}+){0,3})`,
  "g"
);

// Tope de alias distintos que se procesan por mensaje. Sin esto, un mensaje
// con 200 "@" obligaría a resolver 800 candidatos contra la base.
const MAX_MENTIONS = 10;

// Devuelve los alias candidatos en minúsculas, sin repetidos, ordenados del
// más largo al más corto (así quien resuelve puede quedarse con el primero
// que exista y eso es el match más específico).
export function extractMentionCandidates(text: string): string[] {
  const found = new Set<string>();

  BRACKETED_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BRACKETED_RE.exec(text)) !== null) {
    const alias = m[1].trim();
    if (isPossibleAlias(alias)) found.add(alias.toLowerCase());
  }

  LOOSE_RE.lastIndex = 0;
  while ((m = LOOSE_RE.exec(text)) !== null) {
    // Cada prefijo de palabra es un candidato: "juan perez dijo" también
    // aporta "juan perez" y "juan".
    const words = m[2].split(" ");
    for (let i = words.length; i >= 1; i--) {
      const candidate = words.slice(0, i).join(" ");
      if (candidate.length <= MAX_ALIAS_LEN && isPossibleAlias(candidate)) {
        found.add(candidate.toLowerCase());
      }
    }
  }

  return [...found]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, MAX_MENTIONS * 4);
}

// De los alias que EXISTEN, quedarse con los realmente mencionados: el match
// más largo de cada "@" gana, para que "@Juan Perez" no cuente además como una
// mención a "@Juan" (si ambos alias existen).
//
// `existing` son los alias tal como están en la base; la comparación es
// case-insensitive (el índice único del alias también lo es).
export function resolveMentions(text: string, existing: string[]): string[] {
  const byLower = new Map(existing.map((a) => [a.toLowerCase(), a]));
  const winners = new Set<string>();

  // Canónicas: exactas, sin competencia posible.
  BRACKETED_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BRACKETED_RE.exec(text)) !== null) {
    const hit = byLower.get(m[1].trim().toLowerCase());
    if (hit) winners.add(hit);
  }

  // Sueltas: para cada "@", el prefijo más largo que exista.
  LOOSE_RE.lastIndex = 0;
  while ((m = LOOSE_RE.exec(text)) !== null) {
    const words = m[2].split(" ");
    for (let i = words.length; i >= 1; i--) {
      const candidate = words.slice(0, i).join(" ");
      if (candidate.length > MAX_ALIAS_LEN) continue;
      const hit = byLower.get(candidate.toLowerCase());
      if (hit) {
        winners.add(hit);
        break;
      }
    }
  }

  return [...winners].slice(0, MAX_MENTIONS);
}
