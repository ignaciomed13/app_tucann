import { describe, expect, it } from "vitest";
import {
  extractMentionCandidates,
  resolveMentions,
} from "@/lib/forum/mentions";

describe("extractMentionCandidates", () => {
  it("no encuentra nada en un texto sin arrobas", () => {
    expect(extractMentionCandidates("hola, cómo va el cultivo")).toEqual([]);
  });

  it("saca el alias de la forma canónica", () => {
    expect(extractMentionCandidates("gracias [@Ignacio]!")).toEqual(["ignacio"]);
  });

  it("de la forma suelta genera un candidato por cada corte de palabra", () => {
    const got = extractMentionCandidates("@Juan Perez sabe del tema");
    expect(got).toContain("juan");
    expect(got).toContain("juan perez");
    expect(got).toContain("juan perez sabe");
  });

  it("no genera candidatos más largos que el alias máximo (24)", () => {
    const got = extractMentionCandidates("@aaaaaaaaaa bbbbbbbbbb cccccccccc");
    expect(got.every((c) => c.length <= 24)).toBe(true);
  });

  it("ignora el arroba de un email", () => {
    expect(extractMentionCandidates("escribime a hola@tucann.com")).toEqual([]);
  });

  it("no repite candidatos aunque el alias aparezca dos veces", () => {
    const got = extractMentionCandidates("[@Ana] y de nuevo [@ana]");
    expect(got).toEqual(["ana"]);
  });
});

describe("resolveMentions", () => {
  it("resuelve la forma canónica respetando mayúsculas de la base", () => {
    expect(resolveMentions("hola [@ignacio]", ["Ignacio"])).toEqual([
      "Ignacio",
    ]);
  });

  it("ignora un alias que no existe", () => {
    expect(resolveMentions("hola @fantasma", ["Ignacio"])).toEqual([]);
  });

  it("con alias de varias palabras gana el match más largo", () => {
    // Existen los dos: "@Juan Perez dijo" tiene que contar como Juan Perez,
    // no como Juan.
    const got = resolveMentions("@Juan Perez dijo algo", ["Juan", "Juan Perez"]);
    expect(got).toEqual(["Juan Perez"]);
  });

  it("cae al alias corto si el largo no existe", () => {
    expect(resolveMentions("@Juan Perez dijo algo", ["Juan"])).toEqual(["Juan"]);
  });

  it("junta menciones de las dos formas sin duplicar", () => {
    const got = resolveMentions("[@Ana] y @Ana otra vez", ["Ana"]);
    expect(got).toEqual(["Ana"]);
  });

  it("resuelve varias personas distintas en un mismo mensaje", () => {
    const got = resolveMentions("[@Ana] y @Beto miren esto", ["Ana", "Beto"]);
    expect(got.sort()).toEqual(["Ana", "Beto"]);
  });

  it("no explota con un mensaje lleno de arrobas", () => {
    const spam = "@x ".repeat(500);
    expect(resolveMentions(spam, ["x"])).toEqual(["x"]);
  });

  // Las tres formas de alias que hay hoy en la base: una palabra, dos
  // palabras, y con guión en el medio.
  it("resuelve las formas de alias que se usan de verdad", () => {
    const existing = ["Florentino Mota", "rad", "Tucu-lote"];
    expect(resolveMentions("gracias @Florentino Mota!", existing)).toEqual([
      "Florentino Mota",
    ]);
    expect(resolveMentions("@rad qué opinás", existing)).toEqual(["rad"]);
    expect(resolveMentions("ojo [@Tucu-lote]", existing)).toEqual([
      "Tucu-lote",
    ]);
  });
});
