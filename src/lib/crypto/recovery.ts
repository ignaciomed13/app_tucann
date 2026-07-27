import { WORDLIST } from "@/lib/crypto/wordlist";

// 16 palabras × 8 bits = 128 bits de entropía. La frase NO se decodifica de
// vuelta a bytes en ningún lado: se usa el texto normalizado como secreto para
// derivar la clave, así que lo único que hay que validar es que sean 16
// palabras del diccionario.
export const RECOVERY_WORD_COUNT = 16;

// Tolerante con cómo la vuelve a tipear la persona: mayúsculas, tildes que
// agregó de más, saltos de línea o espacios repetidos del copiar y pegar.
export function normalizeRecoveryPhrase(input: string): string {
  return input
    .normalize("NFD")
    // Marcas diacríticas combinantes: las separa el NFD de arriba.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function generateRecoveryPhrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_WORD_COUNT));
  return Array.from(bytes, (b) => WORDLIST[b]).join(" ");
}

export function isValidRecoveryPhrase(input: string): boolean {
  const words = normalizeRecoveryPhrase(input).split(" ").filter(Boolean);
  if (words.length !== RECOVERY_WORD_COUNT) return false;
  return words.every((w) => (WORDLIST as readonly string[]).includes(w));
}
