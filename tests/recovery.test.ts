import { describe, expect, it } from "vitest";
import { WORDLIST } from "@/lib/crypto/wordlist";
import {
  RECOVERY_WORD_COUNT,
  generateRecoveryPhrase,
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
} from "@/lib/crypto/recovery";

describe("diccionario de la frase de recuperación", () => {
  it("tiene exactamente 256 palabras, una por byte", () => {
    expect(WORDLIST).toHaveLength(256);
  });

  it("no repite ninguna palabra", () => {
    // Una repetida rompería la correspondencia byte ↔ palabra en silencio.
    const duplicadas = WORDLIST.filter((w, i) => WORDLIST.indexOf(w) !== i);
    expect(duplicadas).toEqual([]);
  });

  it("no usa tildes ni ñ: la frase se copia a mano", () => {
    const conAcentos = WORDLIST.filter((w) => !/^[a-z]+$/.test(w));
    expect(conAcentos).toEqual([]);
  });
});

describe("frase de recuperación", () => {
  it("genera 16 palabras del diccionario", () => {
    const frase = generateRecoveryPhrase();
    const palabras = frase.split(" ");
    expect(palabras).toHaveLength(RECOVERY_WORD_COUNT);
    for (const p of palabras) {
      expect(WORDLIST as readonly string[]).toContain(p);
    }
  });

  it("no repite la misma frase", () => {
    expect(generateRecoveryPhrase()).not.toBe(generateRecoveryPhrase());
  });

  it("tolera cómo la vuelve a tipear la persona", () => {
    const frase = generateRecoveryPhrase();
    const maltratada = `  ${frase.toUpperCase().replace(/ /g, "\n  ")}  `;
    expect(normalizeRecoveryPhrase(maltratada)).toBe(frase);
    expect(isValidRecoveryPhrase(maltratada)).toBe(true);
  });

  it("saca las tildes que alguien pueda agregar de más", () => {
    expect(normalizeRecoveryPhrase("Cámíno")).toBe("camino");
  });

  it("rechaza frases incompletas o con palabras inventadas", () => {
    const frase = generateRecoveryPhrase();
    expect(isValidRecoveryPhrase("")).toBe(false);
    expect(isValidRecoveryPhrase(frase.split(" ").slice(0, 15).join(" "))).toBe(
      false
    );
    expect(
      isValidRecoveryPhrase([...frase.split(" ").slice(0, 15), "xilofono"].join(" "))
    ).toBe(false);
  });
});
