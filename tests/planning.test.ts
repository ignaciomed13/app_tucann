import { describe, expect, it } from "vitest";
import {
  estimatedHarvestDate,
  harvestWeek,
  startDateForHarvest,
} from "@/lib/grows/cycle";
import {
  buildSchedule,
  daysUntil,
  planNextGrow,
  toISODate,
} from "@/lib/grows/planning";

describe("harvest helpers", () => {
  it("harvestWeek differs by plant type", () => {
    expect(harvestWeek("fotoperiodica")).toBe(18);
    expect(harvestWeek("autofloreciente")).toBe(11);
  });

  it("estimatedHarvestDate = inicio + (semana cosecha - 1) semanas", () => {
    // foto: semana 18 → 17 semanas = 119 días desde el inicio
    expect(toISODate(estimatedHarvestDate("2026-01-01", "fotoperiodica"))).toBe(
      "2026-04-30"
    );
    // auto: semana 11 → 10 semanas = 70 días
    expect(toISODate(estimatedHarvestDate("2026-01-01", "autofloreciente"))).toBe(
      "2026-03-12"
    );
  });

  it("startDateForHarvest es el inverso de estimatedHarvestDate", () => {
    const start = "2026-05-20";
    const harvest = estimatedHarvestDate(start, "autofloreciente");
    expect(toISODate(startDateForHarvest(harvest, "autofloreciente"))).toBe(start);
  });
});

describe("buildSchedule", () => {
  it("ordena por fecha de cosecha ascendente", () => {
    const schedule = buildSchedule([
      { id: "a", name: "Tardía", plant_type: "fotoperiodica", start_date: "2026-03-01" },
      { id: "b", name: "Temprana", plant_type: "autofloreciente", start_date: "2026-01-01" },
    ]);
    expect(schedule.map((s) => s.name)).toEqual(["Temprana", "Tardía"]);
  });
});

describe("daysUntil", () => {
  it("cuenta días hacia adelante y atrás", () => {
    const today = new Date("2026-07-03T15:00:00Z");
    expect(daysUntil(new Date("2026-07-10T00:00:00Z"), today)).toBe(7);
    expect(daysUntil(new Date("2026-07-01T00:00:00Z"), today)).toBe(-2);
  });
});

describe("planNextGrow", () => {
  const today = new Date("2026-07-03T12:00:00Z");

  it("sin cultivos: plantar hoy", () => {
    const plan = planNextGrow([], 3, "fotoperiodica", today);
    expect(plan.plantNow).toBe(true);
    expect(toISODate(plan.startDate)).toBe("2026-07-03");
  });

  it("apunta a cosechar una cadencia después de la última cosecha", () => {
    const lastHarvest = new Date("2026-09-01T00:00:00Z");
    const plan = planNextGrow([lastHarvest], 3, "autofloreciente", today);
    // objetivo de cosecha: 21 días después → 2026-09-22
    expect(toISODate(plan.harvestDate)).toBe("2026-09-22");
    // inicio: 10 semanas (70 días) antes de esa cosecha
    expect(toISODate(plan.startDate)).toBe("2026-07-14");
    expect(plan.plantNow).toBe(false);
  });

  it("si la fecha de plantado ideal ya pasó, plantar hoy", () => {
    const lastHarvest = new Date("2026-07-10T00:00:00Z");
    const plan = planNextGrow([lastHarvest], 1, "fotoperiodica", today);
    expect(plan.plantNow).toBe(true);
    expect(toISODate(plan.startDate)).toBe("2026-07-03");
  });
});
