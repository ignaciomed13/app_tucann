import { describe, expect, it } from "vitest";
import {
  buildGeneticsPrompt,
  GENETICS_SYSTEM_PROMPT,
  NO_GENETICS_DATA,
} from "@/lib/analysis/genetics";

describe("buildGeneticsPrompt", () => {
  it("pasa el nombre de la cepa como pista, no como verdad", () => {
    const prompt = buildGeneticsPrompt("Critical Mass", "", true);
    expect(prompt).toContain("Critical Mass");
    expect(prompt).toContain("si la fuente dice otra cosa");
  });

  it("incluye lo que escribió el cultivador", () => {
    const prompt = buildGeneticsPrompt("", "Floración 8 semanas, 500 g/m2", false);
    expect(prompt).toContain("Floración 8 semanas, 500 g/m2");
    // sin archivo no anuncia adjuntos
    expect(prompt).not.toContain("Adjunto la ficha");
  });

  it("anuncia el archivo cuando viene una imagen o PDF", () => {
    expect(buildGeneticsPrompt("", "", true)).toContain("Adjunto la ficha");
  });

  it("funciona sin nombre ni notas (solo archivo)", () => {
    const prompt = buildGeneticsPrompt("  ", "  ", true);
    expect(prompt).toContain("Devolveme la ficha");
  });
});

describe("GENETICS_SYSTEM_PROMPT", () => {
  it("prohíbe inventar datos y define el sentinel de fuente vacía", () => {
    expect(GENETICS_SYSTEM_PROMPT).toContain("no inventes");
    expect(GENETICS_SYSTEM_PROMPT).toContain(NO_GENETICS_DATA);
  });

  it("pide texto plano, sin Markdown", () => {
    expect(GENETICS_SYSTEM_PROMPT).toContain("sin Markdown");
  });
});
