import { describe, expect, it } from "vitest";
import {
  canBeCutting,
  cyclePhases,
  cycleStatus,
  cycleWeeks,
  minPotVolumeForWeek,
  plantLabel,
  potAlert,
  type CycleSpec,
  type CycleStatus,
} from "@/lib/grows/cycle";

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

const FOTO: CycleSpec = { plant_type: "fotoperiodica", origin: "semilla" };
const AUTO: CycleSpec = { plant_type: "autofloreciente", origin: "semilla" };
const ESQUEJE: CycleSpec = { plant_type: "fotoperiodica", origin: "esqueje" };

describe("cycleStatus (fotoperiódica de semilla)", () => {
  it("is not started before the start date", () => {
    expect(cycleStatus("2026-07-10", utc("2026-07-03"), FOTO)).toEqual({
      started: false,
    });
  });

  it("day 0 is week 1, germinación, total 19", () => {
    expect(cycleStatus("2026-07-03", utc("2026-07-03"), FOTO)).toMatchObject({
      started: true,
      week: 1,
      phase: "germinacion",
      totalWeeks: 19,
    });
  });

  it("maps weeks to phases across the 19-week cycle", () => {
    const start = "2026-01-05";
    const atWeek = (w: number) =>
      cycleStatus(start, new Date(Date.UTC(2026, 0, 5 + (w - 1) * 7, 12)), FOTO);

    expect(atWeek(4)).toMatchObject({ phase: "vegetativo" });
    expect(atWeek(10)).toMatchObject({ phase: "floracion" });
    expect(atWeek(18)).toMatchObject({ phase: "cosecha" });
    expect(atWeek(19)).toMatchObject({ phase: "curado", finished: false });
  });

  it("clamps past the cycle end and flags finished", () => {
    expect(cycleStatus("2026-01-05", utc("2026-12-01"), FOTO)).toMatchObject({
      week: 19,
      finished: true,
    });
  });
});

describe("cycleStatus (autofloreciente)", () => {
  it("has a 12-week cycle with a shorter vegetative phase", () => {
    const start = "2026-01-05";
    const atWeek = (w: number) =>
      cycleStatus(start, new Date(Date.UTC(2026, 0, 5 + (w - 1) * 7, 12)), AUTO);

    expect(atWeek(1)).toMatchObject({ phase: "germinacion", totalWeeks: 12 });
    expect(atWeek(5)).toMatchObject({ phase: "vegetativo" });
    expect(atWeek(6)).toMatchObject({ phase: "floracion" });
    expect(atWeek(11)).toMatchObject({ phase: "cosecha" });
    expect(atWeek(12)).toMatchObject({ phase: "curado", finished: false });
  });

  it("finishes sooner than a photoperiodic plant", () => {
    expect(cycleStatus("2026-01-05", utc("2026-05-01"), AUTO)).toMatchObject({
      week: 12,
      finished: true,
    });
  });
});

describe("cycleStatus (esqueje)", () => {
  const start = "2026-01-05";
  const atWeek = (w: number) =>
    cycleStatus(start, new Date(Date.UTC(2026, 0, 5 + (w - 1) * 7, 12)), ESQUEJE);

  it("arranca enraizando, no germinando", () => {
    expect(atWeek(1)).toMatchObject({
      phase: "enraizamiento",
      totalWeeks: 17,
    });
    expect(atWeek(2)).toMatchObject({ phase: "enraizamiento" });
  });

  it("no pasa por plántula: enraizado va directo a vegetativo", () => {
    expect(atWeek(3)).toMatchObject({ phase: "vegetativo" });
    expect(cyclePhases(ESQUEJE).map((p) => p.phase)).toEqual([
      "enraizamiento",
      "vegetativo",
      "floracion",
      "cosecha",
      "curado",
    ]);
  });

  it("llega a floración y cosecha dos semanas antes que una de semilla", () => {
    expect(atWeek(8)).toMatchObject({ phase: "floracion" });
    expect(atWeek(16)).toMatchObject({ phase: "cosecha" });
    expect(atWeek(17)).toMatchObject({ phase: "curado", finished: false });
  });

  it("una auto marcada como esqueje cae en el ciclo de auto", () => {
    const raro: CycleSpec = {
      plant_type: "autofloreciente",
      origin: "esqueje",
    };
    expect(cycleWeeks(raro)).toBe(12);
    expect(cycleStatus(start, utc("2026-01-05"), raro)).toMatchObject({
      phase: "germinacion",
    });
  });
});

describe("cycleWeeks", () => {
  it("returns the right total per plant type and origin", () => {
    expect(cycleWeeks(FOTO)).toBe(19);
    expect(cycleWeeks(AUTO)).toBe(12);
    expect(cycleWeeks(ESQUEJE)).toBe(17);
  });
});

describe("canBeCutting / plantLabel", () => {
  it("solo las fotoperiódicas se clonan", () => {
    expect(canBeCutting("fotoperiodica")).toBe(true);
    expect(canBeCutting("autofloreciente")).toBe(false);
  });

  it("el origen se aclara solo cuando es esqueje", () => {
    expect(plantLabel(FOTO)).toBe("Fotoperiódica");
    expect(plantLabel(AUTO)).toBe("Autofloreciente");
    expect(plantLabel(ESQUEJE)).toBe("Fotoperiódica (esqueje)");
  });
});

describe("minPotVolumeForWeek", () => {
  it("scales with the photoperiodic cycle", () => {
    expect(minPotVolumeForWeek(1, FOTO)).toBe(0.5);
    expect(minPotVolumeForWeek(4, FOTO)).toBe(3);
    expect(minPotVolumeForWeek(6, FOTO)).toBe(7);
    expect(minPotVolumeForWeek(10, FOTO)).toBe(11);
  });

  it("jumps to the final pot early for autos", () => {
    expect(minPotVolumeForWeek(2, AUTO)).toBe(0.5);
    expect(minPotVolumeForWeek(3, AUTO)).toBe(11);
    expect(minPotVolumeForWeek(10, AUTO)).toBe(11);
  });

  it("el esqueje enraíza en cubo y después sigue la escala normal", () => {
    expect(minPotVolumeForWeek(2, ESQUEJE)).toBe(0.3);
    expect(minPotVolumeForWeek(3, ESQUEJE)).toBe(3);
    expect(minPotVolumeForWeek(7, ESQUEJE)).toBe(7);
    expect(minPotVolumeForWeek(8, ESQUEJE)).toBe(11);
  });
});

function startedStatus(week: number, spec: CycleSpec): CycleStatus {
  const start = "2026-01-05";
  return cycleStatus(
    start,
    new Date(Date.UTC(2026, 0, 5 + (week - 1) * 7, 12)),
    spec
  );
}

describe("potAlert", () => {
  it("photoperiodic: recommends transplanting when the pot is too small", () => {
    const alert = potAlert(startedStatus(6, FOTO), 3, FOTO);
    expect(alert).not.toBeNull();
    expect(alert!.minL).toBe(7);
    expect(alert!.message).toContain("Considerá trasplantar");
  });

  it("autofloreciente: never recommends transplanting", () => {
    const alert = potAlert(startedStatus(5, AUTO), 3, AUTO);
    expect(alert).not.toBeNull();
    expect(alert!.message).not.toContain("trasplantar");
    expect(alert!.message).toContain("maceta definitiva");
  });

  it("stays quiet when the pot is big enough", () => {
    expect(potAlert(startedStatus(6, FOTO), 7, FOTO)).toBeNull();
    expect(potAlert(startedStatus(5, AUTO), 11, AUTO)).toBeNull();
  });

  it("never alerts before start, after finish, or during cosecha/curado", () => {
    expect(potAlert({ started: false }, 1, FOTO)).toBeNull();
    expect(potAlert(startedStatus(18, FOTO), 1, FOTO)).toBeNull();
    expect(potAlert(startedStatus(11, AUTO), 1, AUTO)).toBeNull();
  });

  it("no molesta con la maceta mientras el esqueje enraíza", () => {
    expect(potAlert(startedStatus(1, ESQUEJE), 0.2, ESQUEJE)).toBeNull();
    // ya enraizado, el umbral es el de cualquier fotoperiódica
    const alert = potAlert(startedStatus(3, ESQUEJE), 0.3, ESQUEJE);
    expect(alert).not.toBeNull();
    expect(alert!.minL).toBe(3);
    expect(alert!.message).toContain("Considerá trasplantar");
  });
});
