import { describe, expect, it } from "vitest";
import {
  cycleStatus,
  cycleWeeks,
  minPotVolumeForWeek,
  potAlert,
  type CycleStatus,
} from "@/lib/grows/cycle";

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("cycleStatus (fotoperiódica)", () => {
  it("is not started before the start date", () => {
    expect(cycleStatus("2026-07-10", utc("2026-07-03"), "fotoperiodica")).toEqual({
      started: false,
    });
  });

  it("day 0 is week 1, germinación, total 19", () => {
    expect(
      cycleStatus("2026-07-03", utc("2026-07-03"), "fotoperiodica")
    ).toMatchObject({ started: true, week: 1, phase: "germinacion", totalWeeks: 19 });
  });

  it("maps weeks to phases across the 19-week cycle", () => {
    const start = "2026-01-05";
    const atWeek = (w: number) =>
      cycleStatus(start, new Date(Date.UTC(2026, 0, 5 + (w - 1) * 7, 12)), "fotoperiodica");

    expect(atWeek(4)).toMatchObject({ phase: "vegetativo" });
    expect(atWeek(10)).toMatchObject({ phase: "floracion" });
    expect(atWeek(18)).toMatchObject({ phase: "cosecha" });
    expect(atWeek(19)).toMatchObject({ phase: "curado", finished: false });
  });

  it("clamps past the cycle end and flags finished", () => {
    expect(
      cycleStatus("2026-01-05", utc("2026-12-01"), "fotoperiodica")
    ).toMatchObject({ week: 19, finished: true });
  });
});

describe("cycleStatus (autofloreciente)", () => {
  it("has a 12-week cycle with a shorter vegetative phase", () => {
    const start = "2026-01-05";
    const atWeek = (w: number) =>
      cycleStatus(start, new Date(Date.UTC(2026, 0, 5 + (w - 1) * 7, 12)), "autofloreciente");

    expect(atWeek(1)).toMatchObject({ phase: "germinacion", totalWeeks: 12 });
    expect(atWeek(5)).toMatchObject({ phase: "vegetativo" });
    expect(atWeek(6)).toMatchObject({ phase: "floracion" });
    expect(atWeek(11)).toMatchObject({ phase: "cosecha" });
    expect(atWeek(12)).toMatchObject({ phase: "curado", finished: false });
  });

  it("finishes sooner than a photoperiodic plant", () => {
    expect(
      cycleStatus("2026-01-05", utc("2026-05-01"), "autofloreciente")
    ).toMatchObject({ week: 12, finished: true });
  });
});

describe("cycleWeeks", () => {
  it("returns the right total per plant type", () => {
    expect(cycleWeeks("fotoperiodica")).toBe(19);
    expect(cycleWeeks("autofloreciente")).toBe(12);
  });
});

describe("minPotVolumeForWeek", () => {
  it("scales with the photoperiodic cycle", () => {
    expect(minPotVolumeForWeek(1, "fotoperiodica")).toBe(0.5);
    expect(minPotVolumeForWeek(4, "fotoperiodica")).toBe(3);
    expect(minPotVolumeForWeek(6, "fotoperiodica")).toBe(7);
    expect(minPotVolumeForWeek(10, "fotoperiodica")).toBe(11);
  });

  it("jumps to the final pot early for autos", () => {
    expect(minPotVolumeForWeek(2, "autofloreciente")).toBe(0.5);
    expect(minPotVolumeForWeek(3, "autofloreciente")).toBe(11);
    expect(minPotVolumeForWeek(10, "autofloreciente")).toBe(11);
  });
});

function startedStatus(week: number, plantType: "autofloreciente" | "fotoperiodica"): CycleStatus {
  const start = "2026-01-05";
  return cycleStatus(
    start,
    new Date(Date.UTC(2026, 0, 5 + (week - 1) * 7, 12)),
    plantType
  );
}

describe("potAlert", () => {
  it("photoperiodic: recommends transplanting when the pot is too small", () => {
    const alert = potAlert(startedStatus(6, "fotoperiodica"), 3, "fotoperiodica");
    expect(alert).not.toBeNull();
    expect(alert!.minL).toBe(7);
    expect(alert!.message).toContain("Considerá trasplantar");
  });

  it("autofloreciente: never recommends transplanting", () => {
    const alert = potAlert(startedStatus(5, "autofloreciente"), 3, "autofloreciente");
    expect(alert).not.toBeNull();
    expect(alert!.message).not.toContain("trasplantar");
    expect(alert!.message).toContain("maceta definitiva");
  });

  it("stays quiet when the pot is big enough", () => {
    expect(potAlert(startedStatus(6, "fotoperiodica"), 7, "fotoperiodica")).toBeNull();
    expect(potAlert(startedStatus(5, "autofloreciente"), 11, "autofloreciente")).toBeNull();
  });

  it("never alerts before start, after finish, or during cosecha/curado", () => {
    expect(potAlert({ started: false }, 1, "fotoperiodica")).toBeNull();
    expect(potAlert(startedStatus(18, "fotoperiodica"), 1, "fotoperiodica")).toBeNull();
    expect(potAlert(startedStatus(11, "autofloreciente"), 1, "autofloreciente")).toBeNull();
  });
});
