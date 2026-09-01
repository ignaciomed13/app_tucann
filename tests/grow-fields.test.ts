import { describe, expect, it } from "vitest";
import { parseGrowFields } from "@/lib/grows/grow-fields";
import { GENETICS_INFO_MAX_CHARS } from "@/lib/analysis/genetics";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const base = {
  name: "Mi cultivo",
  genetics: "Northern Lights",
  plant_type: "autofloreciente",
  origin: "semilla",
  substrate: "coco",
  environment: "interior",
  start_date: "2026-06-01",
};

describe("parseGrowFields", () => {
  it("parsea los campos válidos y normaliza opcionales vacíos a null", () => {
    const res = parseGrowFields(form(base));
    expect("fields" in res).toBe(true);
    if ("fields" in res) {
      expect(res.fields).toMatchObject({
        name: "Mi cultivo",
        genetics: "Northern Lights",
        plant_type: "autofloreciente",
        origin: "semilla",
        substrate: "coco",
        environment: "interior",
        variety: null,
        plant_count: 1, // default cuando no viene
        light_type: null,
        light_schedule: null,
        space_id: null,
        start_date: "2026-06-01",
      });
    }
  });

  it("acepta un lote de varias plantas y rechaza valores inválidos", () => {
    const ok = parseGrowFields(form({ ...base, plant_count: "50" }));
    expect("fields" in ok && ok.fields.plant_count).toBe(50);
    expect("error" in parseGrowFields(form({ ...base, plant_count: "0" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, plant_count: "2.5" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, plant_count: "abc" }))).toBe(true);
  });

  it("acepta opcionales cuando vienen y son válidos", () => {
    const res = parseGrowFields(
      form({
        ...base,
        variety: "hibrida_sativa",
        light_type: "led",
        light_schedule: "20/4",
        space_id: "space-123",
      })
    );
    expect("fields" in res).toBe(true);
    if ("fields" in res) {
      expect(res.fields.variety).toBe("hibrida_sativa");
      expect(res.fields.light_type).toBe("led");
      expect(res.fields.light_schedule).toBe("20/4");
      expect(res.fields.space_id).toBe("space-123");
    }
  });

  it("exige nombre, genética y fecha", () => {
    expect("error" in parseGrowFields(form({ ...base, name: "" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, genetics: "" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, start_date: "" }))).toBe(true);
  });

  it("acepta un esqueje fotoperiódico", () => {
    const res = parseGrowFields(
      form({ ...base, plant_type: "fotoperiodica", origin: "esqueje" })
    );
    expect("fields" in res && res.fields.origin).toBe("esqueje");
  });

  it("por defecto un cultivo es de semilla", () => {
    const { name, genetics, plant_type, substrate, environment, start_date } =
      base;
    const res = parseGrowFields(
      form({ name, genetics, plant_type, substrate, environment, start_date })
    );
    expect("fields" in res && res.fields.origin).toBe("semilla");
  });

  it("rechaza clonar una autofloreciente", () => {
    const res = parseGrowFields(
      form({ ...base, plant_type: "autofloreciente", origin: "esqueje" })
    );
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error).toContain("no se clonan");
  });

  it("guarda la ficha de la genética y su archivo, y normaliza vacío a null", () => {
    const sin = parseGrowFields(form(base));
    expect("fields" in sin && sin.fields.genetics_info).toBeNull();
    expect("fields" in sin && sin.fields.genetics_doc_path).toBeNull();

    const con = parseGrowFields(
      form({
        ...base,
        genetics_info: "  Floración: 8 semanas\nAltura: 120 cm  ",
        genetics_doc_path: "user-1/genetics/abc.pdf",
      })
    );
    expect("fields" in con && con.fields.genetics_info).toBe(
      "Floración: 8 semanas\nAltura: 120 cm"
    );
    expect("fields" in con && con.fields.genetics_doc_path).toBe(
      "user-1/genetics/abc.pdf"
    );
  });

  it("rechaza una ficha más larga que el tope de la columna", () => {
    const res = parseGrowFields(
      form({ ...base, genetics_info: "x".repeat(GENETICS_INFO_MAX_CHARS + 1) })
    );
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error).toContain("ficha");
  });

  it("rechaza enums inválidos", () => {
    expect("error" in parseGrowFields(form({ ...base, plant_type: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, substrate: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, environment: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, variety: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, light_type: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, origin: "x" }))).toBe(true);
  });
});
