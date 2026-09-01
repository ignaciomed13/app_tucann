// Lectura de la ficha de la genética. El cultivador carga lo que dice el
// banco —tipeado, o en una foto del packaging o el PDF del semillero— y acá
// lo normalizamos UNA vez a un texto corto y parejo que después viaja en cada
// prompt de análisis (ver src/lib/analysis/prompt.ts).
//
// Módulo puro: no toca red ni Supabase, así que lo pueden importar tanto el
// route handler como el formulario del cliente y los tests.

// Tope del campo. Coincide con el check de la migración 20260901000000.
export const GENETICS_INFO_MAX_CHARS = 4000;

// Formatos que aceptamos para leer una ficha.
export const GENETICS_DOC_ACCEPT = "image/*,application/pdf";

// 8 MB de archivo original. Gemini admite bastante más inline, pero una ficha
// de banco es una foto o un PDF de pocas páginas: si alguien manda algo más
// grande casi siempre es un error, y el base64 infla un tercio.
export const GENETICS_DOC_MAX_BYTES = 8 * 1024 * 1024;

// Sentinel que devuelve el modelo cuando el archivo no tiene nada útil (una
// foto borrosa, un PDF que no era la ficha). Lo convertimos en un error
// entendible en vez de guardar una ficha inventada.
export const NO_GENETICS_DATA = "SIN_DATOS";

export const GENETICS_SYSTEM_PROMPT =
  "Sos un asistente que lee fichas técnicas de genéticas de cannabis y las " +
  "resume para un cultivador. Recibís texto, una foto del packaging o un PDF " +
  "del banco de semillas. Tu tarea es EXTRAER los datos que aparecen, no " +
  "opinar ni completar con lo que sepas de la cepa. " +
  "Devolvé texto plano, sin Markdown (nada de **, # ni viñetas), una línea " +
  "por dato, con este formato y en este orden, salteando las líneas cuyo " +
  "dato no aparezca en la fuente:\n" +
  "Cepa: ...\n" +
  "Banco: ...\n" +
  "Tipo: autofloreciente o fotoperiódica\n" +
  "Variedad: índica, sativa o híbrida (con predominancia si la dice)\n" +
  "Floración: ... (días o semanas)\n" +
  "Cosecha exterior: ...\n" +
  "Altura: ...\n" +
  "Rendimiento: ... (interior y/o exterior)\n" +
  "THC: ...\n" +
  "CBD: ...\n" +
  "Resistencias: ... (hongos, plagas, frío)\n" +
  "Notas de cultivo: ... (riego, nutrición, poda, EC, lo que recomiende el banco)\n" +
  "REGLAS: no inventes ningún número ni rango que no esté en la fuente. Si un " +
  "dato no está, omití la línea entera en vez de estimarlo. Respetá las " +
  "unidades tal como vienen. Si la fuente no tiene NINGÚN dato de una " +
  "genética (foto ilegible, archivo que no es una ficha, texto sin " +
  "información), respondé exactamente " +
  NO_GENETICS_DATA +
  " y nada más. Máximo 180 palabras.";

// Mensaje de usuario para la extracción. El nombre de la genética que ya
// cargó en el form va como pista, pero la fuente manda: si la ficha dice otra
// cepa, gana la ficha.
export function buildGeneticsPrompt(
  geneticsName: string,
  notes: string,
  hasDoc: boolean
): string {
  const lines: string[] = [];

  const name = geneticsName.trim();
  if (name) {
    lines.push(
      `El cultivador anotó que la genética es "${name}". Usalo solo como ` +
        "referencia: si la fuente dice otra cosa, mandá lo que dice la fuente."
    );
  }

  const text = notes.trim();
  if (text) {
    lines.push("", "Lo que cargó el cultivador:", text);
  }

  if (hasDoc) {
    lines.push(
      "",
      "Adjunto la ficha del banco (imagen o PDF). Leela y extraé los datos."
    );
  }

  lines.push("", "Devolveme la ficha con el formato indicado.");
  return lines.join("\n");
}
