import { describe, expect, it } from "vitest";
import {
  parseBBCode,
  type BBElement,
  type BBNode,
} from "@/lib/forum/bbcode";

// Helper: el primer hijo de tipo elemento.
function el(nodes: BBNode[], i = 0): BBElement {
  const found = nodes.filter((n) => typeof n !== "string")[i];
  if (!found || typeof found === "string") throw new Error("no element");
  return found;
}

describe("parseBBCode", () => {
  it("deja el texto plano como string (sin elementos)", () => {
    const nodes = parseBBCode("hola mundo");
    expect(nodes).toEqual(["hola mundo"]);
  });

  it("negrita produce fontWeight 700 y conserva el texto adentro", () => {
    const e = el(parseBBCode("un [b]texto[/b] fuerte"));
    expect(e.tag).toBe("b");
    expect(e.style).toEqual({ fontWeight: 700 });
    expect(e.children).toEqual(["texto"]);
  });

  it("size con valor de la lista blanca aplica fontSize", () => {
    const e = el(parseBBCode("[size=grande]che[/size]"));
    expect(e.style).toEqual({ fontSize: "1.3em" });
  });

  it("size con valor inventado NO aplica estilo pero mantiene el texto", () => {
    const e = el(parseBBCode("[size=999px]che[/size]"));
    expect(e.style).toBeNull();
    expect(e.children).toEqual(["che"]);
  });

  it("font sólo acepta fuentes de la lista blanca", () => {
    expect(el(parseBBCode("[font=mono]x[/font]")).style).toEqual({
      fontFamily: "ui-monospace, 'Courier New', monospace",
    });
    expect(el(parseBBCode("[font=Arial]x[/font]")).style).toBeNull();
  });

  it("color acepta nombres de la lista y hex válido; rechaza inyección", () => {
    expect(el(parseBBCode("[color=verde]x[/color]")).style).toEqual({
      color: "#15803d",
    });
    expect(el(parseBBCode("[color=#ff0000]x[/color]")).style).toEqual({
      color: "#ff0000",
    });
    // Un intento de meter CSS arbitrario no es hex ni está en la lista → sin estilo.
    const inj = el(parseBBCode("[color=red;background:url(x)]x[/color]"));
    expect(inj.style).toBeNull();
    expect(inj.children).toEqual(["x"]);
  });

  it("etiquetas anidadas se resuelven bien", () => {
    const outer = el(parseBBCode("[b]hola [i]che[/i][/b]"));
    expect(outer.tag).toBe("b");
    const inner = el(outer.children);
    expect(inner.tag).toBe("i");
    expect(inner.children).toEqual(["che"]);
  });

  it("una apertura sin cierre se autocierra sin perder texto", () => {
    const e = el(parseBBCode("[b]sin cierre"));
    expect(e.tag).toBe("b");
    expect(e.children).toEqual(["sin cierre"]);
  });

  it("un cierre huérfano queda como texto literal", () => {
    const nodes = parseBBCode("texto [/b] suelto");
    expect(nodes.every((n) => typeof n === "string")).toBe(true);
    expect(nodes.join("")).toBe("texto [/b] suelto");
  });

  it("un corchete suelto no se come el resto del mensaje", () => {
    const nodes = parseBBCode("precio [50] pesos");
    expect(nodes.join("")).toContain("[50] pesos");
  });

  it("preserva saltos de línea como parte del texto", () => {
    const nodes = parseBBCode("linea uno\nlinea dos");
    expect(nodes).toEqual(["linea uno\nlinea dos"]);
  });
});
