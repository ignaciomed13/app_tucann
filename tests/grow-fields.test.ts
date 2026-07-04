import { describe, expect, it } from "vitest";
import { parseGrowFields } from "@/lib/grows/grow-fields";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const base = {
  name: "Mi cultivo",
  genetics: "Northern Lights",
  plant_type: "autofloreciente",
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
        substrate: "coco",
        environment: "interior",
        variety: null,
        light_type: null,
        light_schedule: null,
        space_id: null,
        start_date: "2026-06-01",
      });
    }
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

  it("rechaza enums inválidos", () => {
    expect("error" in parseGrowFields(form({ ...base, plant_type: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, substrate: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, environment: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, variety: "x" }))).toBe(true);
    expect("error" in parseGrowFields(form({ ...base, light_type: "x" }))).toBe(true);
  });
});
