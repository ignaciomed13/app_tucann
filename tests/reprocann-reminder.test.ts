import { describe, expect, it } from "vitest";
import { computeReprocannReminder } from "@/lib/notifications/reminders";

const today = new Date("2026-07-11T15:00:00Z");

describe("computeReprocannReminder", () => {
  it("no avisa si falta más de 30 días", () => {
    expect(computeReprocannReminder("2026-12-01", today)).toBeNull();
    expect(computeReprocannReminder("2026-08-11", today)).toBeNull(); // 31 días
  });

  it("avisa con el umbral de 30 días entre 30 y 8 días antes", () => {
    const at30 = computeReprocannReminder("2026-08-10", today);
    expect(at30?.dedupeKey).toBe("2026-08-10|30");
    expect(at30?.body).toContain("30 días");

    const at15 = computeReprocannReminder("2026-07-26", today);
    expect(at15?.dedupeKey).toBe("2026-07-26|30");
  });

  it("avisa con el umbral de 7 días entre 7 y 1 días antes", () => {
    const at7 = computeReprocannReminder("2026-07-18", today);
    expect(at7?.dedupeKey).toBe("2026-07-18|7");

    const at1 = computeReprocannReminder("2026-07-12", today);
    expect(at1?.dedupeKey).toBe("2026-07-12|7");
    expect(at1?.body).toContain("1 día");
  });

  it("avisa el día del vencimiento y después de vencido, con umbral 0", () => {
    const hoy = computeReprocannReminder("2026-07-11", today);
    expect(hoy?.dedupeKey).toBe("2026-07-11|0");
    expect(hoy?.title).toContain("hoy");

    const vencido = computeReprocannReminder("2026-07-01", today);
    expect(vencido?.dedupeKey).toBe("2026-07-01|0");
    expect(vencido?.title).toContain("vencido");
    expect(vencido?.body).toContain("hace 10 días");
  });

  it("cada umbral tiene dedupeKey distinto y renovar reinicia el ciclo", () => {
    const keys = new Set(
      ["2026-07-11", "2026-07-15", "2026-08-01"].map(
        (d) => computeReprocannReminder(d, today)?.dedupeKey
      )
    );
    expect(keys.size).toBe(3);
  });
});
