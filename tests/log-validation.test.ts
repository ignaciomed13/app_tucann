import { describe, expect, it } from "vitest";
import {
  isValidLogType,
  parseLogData,
  suggestedWatering,
} from "@/lib/logs/validation";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("parseLogData", () => {
  it("environmental: accepts partial fields and coerces numbers", () => {
    const result = parseLogData(
      "environmental",
      form({ temperature_c: "24.5", humidity_pct: "60" })
    );
    expect(result).toEqual({
      ok: true,
      data: { temperature_c: 24.5, humidity_pct: 60 },
    });
  });

  it("environmental: rejects when every field is empty", () => {
    const result = parseLogData("environmental", form({}));
    expect(result.ok).toBe(false);
  });

  it("environmental: rejects out-of-range ph", () => {
    const result = parseLogData("environmental", form({ ph: "15" }));
    expect(result.ok).toBe(false);
  });

  it("watering: requires a positive volume", () => {
    expect(parseLogData("watering", form({ volume_l: "0.45" }))).toEqual({
      ok: true,
      data: { volume_l: 0.45 },
    });
    expect(parseLogData("watering", form({})).ok).toBe(false);
    expect(parseLogData("watering", form({ volume_l: "-1" })).ok).toBe(false);
    expect(parseLogData("watering", form({ volume_l: "abc" })).ok).toBe(false);
  });

  it("nutrition: requires product and dose", () => {
    expect(
      parseLogData("nutrition", form({ product: "BioGrow", dose: "2 ml/L" }))
    ).toEqual({ ok: true, data: { product: "BioGrow", dose: "2 ml/L" } });
    expect(parseLogData("nutrition", form({ product: "BioGrow" })).ok).toBe(
      false
    );
  });

  it("observation: requires non-empty notes and trims", () => {
    expect(parseLogData("observation", form({ notes: "  hojas verdes  " })))
      .toEqual({ ok: true, data: { notes: "hojas verdes" } });
    expect(parseLogData("observation", form({ notes: "   " })).ok).toBe(false);
  });

  it("transplant: requires a positive new volume", () => {
    expect(parseLogData("transplant", form({ new_volume_l: "7" }))).toEqual({
      ok: true,
      data: { new_volume_l: 7 },
    });
    expect(parseLogData("transplant", form({})).ok).toBe(false);
    expect(parseLogData("transplant", form({ new_volume_l: "0" })).ok).toBe(
      false
    );
  });

  it("training: requires a known technique, notes optional", () => {
    expect(parseLogData("training", form({ technique: "lst" }))).toEqual({
      ok: true,
      data: { technique: "lst" },
    });
    expect(
      parseLogData("training", form({ technique: "despunte", notes: "2 nudos" }))
    ).toEqual({ ok: true, data: { technique: "despunte", notes: "2 nudos" } });
    expect(parseLogData("training", form({})).ok).toBe(false);
    expect(parseLogData("training", form({ technique: "inexistente" })).ok).toBe(
      false
    );
  });

  it("sanidad: requiere plaga/enfermedad conocida y severidad", () => {
    expect(
      parseLogData("sanidad", form({ issue: "oidio", severity: "moderada" }))
    ).toEqual({ ok: true, data: { issue: "oidio", severity: "moderada" } });
    expect(
      parseLogData(
        "sanidad",
        form({ issue: "arana_roja", severity: "severa", notes: "hojas punteadas" })
      )
    ).toEqual({
      ok: true,
      data: { issue: "arana_roja", severity: "severa", notes: "hojas punteadas" },
    });
    expect(parseLogData("sanidad", form({ severity: "leve" })).ok).toBe(false);
    expect(parseLogData("sanidad", form({ issue: "oidio" })).ok).toBe(false);
    expect(
      parseLogData("sanidad", form({ issue: "x", severity: "leve" })).ok
    ).toBe(false);
    expect(
      parseLogData("sanidad", form({ issue: "oidio", severity: "x" })).ok
    ).toBe(false);
  });
});

describe("isValidLogType", () => {
  it("accepts the five known types and rejects others", () => {
    for (const t of [
      "environmental",
      "watering",
      "nutrition",
      "observation",
      "transplant",
    ]) {
      expect(isValidLogType(t)).toBe(true);
    }
    expect(isValidLogType("harvest")).toBe(false);
    expect(isValidLogType("")).toBe(false);
  });
});

describe("suggestedWatering", () => {
  it("returns 10-15% of the pot volume", () => {
    expect(suggestedWatering(10)).toEqual({ minL: 1, maxL: 1.5 });
    expect(suggestedWatering(3)).toEqual({ minL: 0.3, maxL: 0.45 });
  });

  it("rounds to two decimals", () => {
    expect(suggestedWatering(7)).toEqual({ minL: 0.7, maxL: 1.05 });
  });
});
