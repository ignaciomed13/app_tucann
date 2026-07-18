import { describe, expect, it } from "vitest";
import {
  normalizeUrl,
  parsePartnerSubmission,
} from "@/lib/partners/submissions";

// Simula el shape mínimo de FormData que consume parsePartnerSubmission.
function form(fields: Record<string, string>) {
  return {
    get: (key: string) => (key in fields ? fields[key] : null),
  };
}

describe("normalizeUrl", () => {
  it("agrega https:// si falta el esquema", () => {
    expect(normalizeUrl("growshop.com.ar")).toBe("https://growshop.com.ar/");
    expect(normalizeUrl("instagram.com/growshop")).toBe(
      "https://instagram.com/growshop"
    );
  });

  it("conserva http(s) existente", () => {
    expect(normalizeUrl("http://ejemplo.com")).toBe("http://ejemplo.com/");
  });

  it("rechaza esquemas no http, hosts sin punto y basura", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("http://localhost")).toBeNull();
    expect(normalizeUrl("no es una url")).toBeNull();
  });

  it("devuelve null para string vacío", () => {
    expect(normalizeUrl("   ")).toBeNull();
  });
});

describe("parsePartnerSubmission", () => {
  it("acepta una postulación válida y normaliza campos vacíos a null", () => {
    const r = parsePartnerSubmission(
      form({
        name: "Growshop Norte",
        category: "growshop",
        description: "",
        city: "Córdoba",
        province: "",
        url: "growshopnorte.com",
      })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual({
        name: "Growshop Norte",
        category: "growshop",
        description: null,
        city: "Córdoba",
        province: null,
        url: "https://growshopnorte.com/",
      });
    }
  });

  it("exige nombre de al menos 2 caracteres", () => {
    const r = parsePartnerSubmission(form({ name: "x", category: "growshop" }));
    expect(r.ok).toBe(false);
  });

  it("rechaza categorías fuera de la lista", () => {
    const r = parsePartnerSubmission(
      form({ name: "Válido", category: "banco" })
    );
    expect(r).toEqual({ ok: false, error: "Elegí una categoría válida." });
  });

  it("rechaza URL inválida", () => {
    const r = parsePartnerSubmission(
      form({ name: "Válido", category: "vivero", url: "javascript:alert(1)" })
    );
    expect(r).toEqual({ ok: false, error: "El sitio web no es una URL válida." });
  });

  it("rechaza descripción demasiado larga", () => {
    const r = parsePartnerSubmission(
      form({
        name: "Válido",
        category: "growshop",
        description: "a".repeat(401),
      })
    );
    expect(r.ok).toBe(false);
  });
});
