import { describe, expect, it } from "vitest";
import {
  estimatedHarvestDate,
  harvestWeek,
  startDateForHarvest,
  type CycleSpec,
} from "@/lib/grows/cycle";
import {
  buildSchedule,
  daysUntil,
  planNextGrow,
  toISODate,
} from "@/lib/grows/planning";

const FOTO: CycleSpec = { plant_type: "fotoperiodica", origin: "semilla" };
const AUTO: CycleSpec = { plant_type: "autofloreciente", origin: "semilla" };
const ESQUEJE: CycleSpec = { plant_type: "fotoperiodica", origin: "esqueje" };

describe("harvest helpers", () => {
  it("harvestWeek differs by plant type and origin", () => {
    expect(harvestWeek(FOTO)).toBe(18);
    expect(harvestWeek(AUTO)).toBe(11);
    expect(harvestWeek(ESQUEJE)).toBe(16);
  });

  it("estimatedHarvestDate = inicio + (semana cosecha - 1) semanas", () => {
    // foto: semana 18 → 17 semanas = 119 días desde el inicio
    expect(toISODate(estimatedHarvestDate("2026-01-01", FOTO))).toBe(
      "2026-04-30"
    );
    // auto: semana 11 → 10 semanas = 70 días
    expect(toISODate(estimatedHarvestDate("2026-01-01", AUTO))).toBe(
      "2026-03-12"
    );
  });

  it("el esqueje cosecha 2 semanas antes que la misma foto de semilla", () => {
    // esqueje: semana 16 → 15 semanas = 105 días desde el corte
    expect(toISODate(estimatedHarvestDate("2026-01-01", ESQUEJE))).toBe(
      "2026-04-16"
    );
  });

  it("startDateForHarvest es el inverso de estimatedHarvestDate", () => {
    const start = "2026-05-20";
    const harvest = estimatedHarvestDate(start, AUTO);
    expect(toISODate(startDateForHarvest(harvest, AUTO))).toBe(start);
  });
});

describe("buildSchedule", () => {
  it("ordena por fecha de cosecha ascendente", () => {
    const schedule = buildSchedule([
      { id: "a", ...FOTO, name: "Tardía", start_date: "2026-03-01" },
      { id: "b", ...AUTO, name: "Temprana", start_date: "2026-01-01" },
      { id: "c", ...ESQUEJE, name: "Clon", start_date: "2026-02-01" },
    ]);
    // el clon arrancó después que la tardía pero su ciclo es más corto
    expect(schedule.map((s) => s.name)).toEqual(["Temprana", "Clon", "Tardía"]);
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
    const plan = planNextGrow([], 3, FOTO, today);
    expect(plan.plantNow).toBe(true);
    expect(toISODate(plan.startDate)).toBe("2026-07-03");
  });

  it("apunta a cosechar una cadencia después de la última cosecha", () => {
    const lastHarvest = new Date("2026-09-01T00:00:00Z");
    const plan = planNextGrow([lastHarvest], 3, AUTO, today);
    // objetivo de cosecha: 21 días después → 2026-09-22
    expect(toISODate(plan.harvestDate)).toBe("2026-09-22");
    // inicio: 10 semanas (70 días) antes de esa cosecha
    expect(toISODate(plan.startDate)).toBe("2026-07-14");
    expect(plan.plantNow).toBe(false);
  });

  it("si la fecha de plantado ideal ya pasó, plantar hoy", () => {
    const lastHarvest = new Date("2026-07-10T00:00:00Z");
    const plan = planNextGrow([lastHarvest], 1, FOTO, today);
    expect(plan.plantNow).toBe(true);
    expect(toISODate(plan.startDate)).toBe("2026-07-03");
  });
});
