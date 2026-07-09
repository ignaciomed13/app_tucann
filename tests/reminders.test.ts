import { describe, expect, it } from "vitest";
import {
  computeReminders,
  type GrowReminderInput,
} from "@/lib/notifications/reminders";

const today = new Date("2026-07-15T12:00:00Z");
const URL = "/dashboard/grows/abc";

function base(overrides: Partial<GrowReminderInput> = {}): GrowReminderInput {
  return {
    name: "Mi cultivo",
    plant_type: "fotoperiodica",
    start_date: "2026-06-01", // ~semana 7, vegetativo
    lastWateringDate: null,
    lastSanidadDate: null,
    lastSanidadIssueLabel: null,
    ...overrides,
  };
}

const titles = (rs: { title: string }[]) => rs.map((r) => r.title);

describe("computeReminders", () => {
  it("no genera nada si el ciclo no empezó o terminó", () => {
    expect(computeReminders(base({ start_date: "2026-08-01" }), today, URL)).toEqual([]);
    expect(computeReminders(base({ start_date: "2025-01-01" }), today, URL)).toEqual([]);
  });

  it("riego: dispara a los 4 días o más sin riego", () => {
    const r = computeReminders(base({ lastWateringDate: "2026-07-11" }), today, URL);
    expect(titles(r)).toContain("Riego 💧");
    // 5 días (ej. log retro-fechado) → también dispara, con los días reales
    const r5 = computeReminders(base({ lastWateringDate: "2026-07-10" }), today, URL);
    const riego5 = r5.find((x) => x.title === "Riego 💧");
    expect(riego5).toBeDefined();
    expect(riego5!.body).toContain("5 días");
    // 3 días → todavía no
    expect(titles(computeReminders(base({ lastWateringDate: "2026-07-12" }), today, URL))).not.toContain("Riego 💧");
  });

  it("riego: el dedupeKey es la fecha base y no cambia entre días", () => {
    // Mismo riego visto hoy y mañana → misma clave: el cron lo envía una vez.
    const r1 = computeReminders(base({ lastWateringDate: "2026-07-10" }), today, URL);
    const r2 = computeReminders(
      base({ lastWateringDate: "2026-07-10" }),
      new Date("2026-07-16T12:00:00Z"),
      URL
    );
    const k1 = r1.find((x) => x.kind === "riego")!.dedupeKey;
    const k2 = r2.find((x) => x.kind === "riego")!.dedupeKey;
    expect(k1).toBe("2026-07-10");
    expect(k2).toBe(k1);
    // Un riego nuevo cambia la clave → habilita el próximo aviso.
    const r3 = computeReminders(
      base({ lastWateringDate: "2026-07-16" }),
      new Date("2026-07-20T12:00:00Z"),
      URL
    );
    expect(r3.find((x) => x.kind === "riego")!.dedupeKey).toBe("2026-07-16");
  });

  it("cosecha próxima: dispara 7 días antes", () => {
    // fotoperiódica cosecha semana 18 → inicio + 119 días = cosecha
    // para cosecha 2026-07-22 (today+7), inicio 2026-03-25
    const r = computeReminders(base({ start_date: "2026-03-25" }), today, URL);
    expect(titles(r)).toContain("Cosecha próxima 🌾");
    expect(r.find((x) => x.title.includes("Cosecha"))!.body).toContain("7 días");
  });

  it("cambio de fase: dispara el día que entra a la nueva fase", () => {
    // inicio 2026-05-13 → hoy es el día 63 = semana 10 = Floración (ayer sem 9)
    const r = computeReminders(base({ start_date: "2026-05-13" }), today, URL);
    const phase = r.find((x) => x.title.includes("Cambio de fase"));
    expect(phase).toBeDefined();
    expect(phase!.body).toContain("Floración");
  });

  it("sanidad: recuerda seguimiento a los 3 días", () => {
    const r = computeReminders(
      base({ lastSanidadDate: "2026-07-12", lastSanidadIssueLabel: "Oídio" }),
      today,
      URL
    );
    const san = r.find((x) => x.title.includes("sanidad"));
    expect(san).toBeDefined();
    expect(san!.body).toContain("Oídio");
    // a los 2 días no
    expect(
      titles(computeReminders(base({ lastSanidadDate: "2026-07-13" }), today, URL))
    ).not.toContain("Seguimiento de sanidad 🔎");
  });
});
