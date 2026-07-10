import { describe, expect, it } from "vitest";
import { buildTucuTips, type GrowForTips } from "@/lib/mascot/tips";
import { argDay, isFromToday } from "@/lib/analysis/cooldown";

const today = new Date("2026-07-10T12:00:00Z");

const grow: GrowForTips = {
  name: "Sativa Test",
  plant_type: "fotoperiodica",
  start_date: "2026-05-20", // semana 8 → vegetativo
  current_pot_volume_l: 11,
  lastAnalysisAt: null,
};

describe("buildTucuTips — conexión con el análisis IA", () => {
  it("sugiere pedir un análisis cuando el cultivo nunca fue analizado", () => {
    const tips = buildTucuTips([grow], today);
    expect(tips.some((t) => t.includes("todavía no analicé"))).toBe(true);
  });

  it("sugiere un análisis nuevo cuando el último tiene 7 días o más", () => {
    const tips = buildTucuTips(
      [{ ...grow, lastAnalysisAt: "2026-07-01T10:00:00Z" }],
      today
    );
    const nudge = tips.find((t) => t.includes("que no lo analizo"));
    expect(nudge).toBeDefined();
    expect(nudge).toContain("hace 9 días");
  });

  it("no insiste cuando hay un análisis reciente", () => {
    const tips = buildTucuTips(
      [{ ...grow, lastAnalysisAt: "2026-07-08T10:00:00Z" }],
      today
    );
    expect(tips.some((t) => t.includes("🔍"))).toBe(false);
  });

  it("no sugiere análisis para cultivos terminados", () => {
    const tips = buildTucuTips(
      [{ ...grow, start_date: "2025-01-01" }],
      today
    );
    expect(tips.some((t) => t.includes("🔍"))).toBe(false);
  });

  it("las alertas de maceta siguen teniendo prioridad sobre el nudge de análisis", () => {
    const tips = buildTucuTips([{ ...grow, current_pot_volume_l: 1 }], today);
    const alertIdx = tips.findIndex((t) => t.includes("maceta chica"));
    const nudgeIdx = tips.findIndex((t) => t.includes("todavía no analicé"));
    expect(alertIdx).toBeGreaterThanOrEqual(0);
    expect(nudgeIdx).toBeGreaterThan(alertIdx);
  });
});

describe("cooldown del análisis (día calendario argentino, UTC-3)", () => {
  it("un análisis de esta mañana cuenta como de hoy", () => {
    expect(isFromToday("2026-07-10T11:00:00Z", today)).toBe(true);
  });

  it("un análisis de ayer no cuenta como de hoy", () => {
    expect(isFromToday("2026-07-09T18:00:00Z", today)).toBe(false);
  });

  it("la medianoche se corta en horario argentino, no UTC", () => {
    // 01:00 UTC del día 10 = 22:00 del día 9 en Argentina.
    expect(argDay(new Date("2026-07-10T01:00:00Z"))).toBe("2026-07-09");
    expect(argDay(new Date("2026-07-10T04:00:00Z"))).toBe("2026-07-10");
  });
});
