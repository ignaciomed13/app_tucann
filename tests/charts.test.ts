import { describe, expect, it } from "vitest";
import {
  environmentalSeries,
  presentEnvMetrics,
  environmentalByPlant,
  wateringSeries,
  potVolumeSteps,
  eventMarkers,
  harvestBars,
  hasChartableData,
  dateToTs,
  type ChartLog,
} from "@/lib/grows/charts";

describe("dateToTs", () => {
  it("interpreta la fecha en UTC a medianoche", () => {
    expect(dateToTs("2026-07-01")).toBe(Date.UTC(2026, 6, 1));
  });
});

describe("environmentalSeries", () => {
  it("arma la serie ordenada por fecha con las métricas presentes", () => {
    const logs: ChartLog[] = [
      { type: "environmental", log_date: "2026-07-02", data: { temperature_c: 26, humidity_pct: 55 } },
      { type: "environmental", log_date: "2026-07-01", data: { temperature_c: 24, humidity_pct: 60, ec: 1.4, ph: 6.2 } },
      { type: "watering", log_date: "2026-07-01", data: { volume_l: 0.5 } },
    ];
    const rows = environmentalSeries(logs);
    expect(rows.map((r) => r.date)).toEqual(["2026-07-01", "2026-07-02"]);
    expect(rows[0]).toMatchObject({ temperature_c: 24, humidity_pct: 60, ec: 1.4, ph: 6.2 });
    expect(rows[1]).toMatchObject({ temperature_c: 26, humidity_pct: 55 });
    // el 2 de julio no tiene ec/ph
    expect(rows[1].ec).toBeUndefined();
  });

  it("promedia varias lecturas del mismo día por métrica", () => {
    const logs: ChartLog[] = [
      { type: "environmental", log_date: "2026-07-01", data: { temperature_c: 20 } },
      { type: "environmental", log_date: "2026-07-01", data: { temperature_c: 30, humidity_pct: 50 } },
    ];
    const rows = environmentalSeries(logs);
    expect(rows).toHaveLength(1);
    expect(rows[0].temperature_c).toBe(25); // (20+30)/2
    expect(rows[0].humidity_pct).toBe(50); // única lectura
  });

  it("ignora valores no numéricos", () => {
    const logs: ChartLog[] = [
      { type: "environmental", log_date: "2026-07-01", data: { temperature_c: "hot", ec: 1.2 } },
    ];
    const rows = environmentalSeries(logs);
    expect(rows[0].temperature_c).toBeUndefined();
    expect(rows[0].ec).toBe(1.2);
  });

  it("devuelve serie vacía si no hay logs ambientales", () => {
    expect(environmentalSeries([{ type: "watering", log_date: "2026-07-01", data: { volume_l: 1 } }])).toEqual([]);
  });
});

describe("presentEnvMetrics", () => {
  it("lista sólo las métricas con al menos un dato", () => {
    const rows = environmentalSeries([
      { type: "environmental", log_date: "2026-07-01", data: { temperature_c: 24, humidity_pct: 60 } },
    ]);
    expect(presentEnvMetrics(rows)).toEqual(["temperature_c", "humidity_pct"]);
  });
});

describe("environmentalByPlant", () => {
  const labels = { p1: "A1", p2: "B2" };

  it("desglosa por planta cuando 2+ plantas tienen la métrica", () => {
    const logs: ChartLog[] = [
      { type: "environmental", log_date: "2026-07-01", data: { ec: 1.2 }, plant_id: "p1" },
      { type: "environmental", log_date: "2026-07-01", data: { ec: 1.8 }, plant_id: "p2" },
      { type: "environmental", log_date: "2026-07-02", data: { ec: 1.3 }, plant_id: "p1" },
    ];
    const series = environmentalByPlant(logs, "ec", labels);
    expect(series).not.toBeNull();
    expect(series!.labels).toEqual(["A1", "B2"]);
    expect(series!.rows[0]).toMatchObject({ date: "2026-07-01", A1: 1.2, B2: 1.8 });
    expect(series!.rows[1]).toMatchObject({ date: "2026-07-02", A1: 1.3 });
    expect(series!.rows[1].B2).toBeUndefined();
  });

  it("devuelve null si sólo 1 planta tiene datos", () => {
    const logs: ChartLog[] = [
      { type: "environmental", log_date: "2026-07-01", data: { ec: 1.2 }, plant_id: "p1" },
      { type: "environmental", log_date: "2026-07-01", data: { ec: 1.5 } }, // lote, sin planta
    ];
    expect(environmentalByPlant(logs, "ec", labels)).toBeNull();
  });
});

describe("wateringSeries", () => {
  it("suma volúmenes del mismo día y ordena por fecha", () => {
    const logs: ChartLog[] = [
      { type: "watering", log_date: "2026-07-02", data: { volume_l: 0.4 } },
      { type: "watering", log_date: "2026-07-01", data: { volume_l: 0.3 } },
      { type: "watering", log_date: "2026-07-01", data: { volume_l: 0.2 } },
    ];
    const bars = wateringSeries(logs);
    expect(bars).toEqual([
      { t: dateToTs("2026-07-01"), date: "2026-07-01", volume_l: 0.5 },
      { t: dateToTs("2026-07-02"), date: "2026-07-02", volume_l: 0.4 },
    ]);
  });
});

describe("potVolumeSteps", () => {
  it("arranca en el volumen inicial y sube en cada trasplante", () => {
    const logs: ChartLog[] = [
      { type: "transplant", log_date: "2026-06-15", data: { new_volume_l: 7 } },
      { type: "transplant", log_date: "2026-06-01", data: { new_volume_l: 3 } },
    ];
    const steps = potVolumeSteps(logs, 1, "2026-05-20");
    expect(steps).toEqual([
      { t: dateToTs("2026-05-20"), date: "2026-05-20", volume_l: 1 },
      { t: dateToTs("2026-06-01"), date: "2026-06-01", volume_l: 3 },
      { t: dateToTs("2026-06-15"), date: "2026-06-15", volume_l: 7 },
    ]);
  });

  it("devuelve null si no hubo trasplantes", () => {
    expect(potVolumeSteps([], 5, "2026-05-20")).toBeNull();
  });
});

describe("eventMarkers", () => {
  it("marca sólo tipos anotables y ordena por fecha", () => {
    const logs: ChartLog[] = [
      { type: "cosecha", log_date: "2026-07-05", data: { dry_weight_g: 40 } },
      { type: "training", log_date: "2026-07-03", data: { technique: "lst" } },
      { type: "observation", log_date: "2026-07-02", data: { notes: "hola" } },
      { type: "transplant", log_date: "2026-07-01", data: { new_volume_l: 7 } },
    ];
    const marks = eventMarkers(logs);
    expect(marks.map((m) => m.kind)).toEqual(["transplant", "training"]);
    expect(marks[0].emoji).toBe("🪴");
  });

  it("respeta el filtro de kinds", () => {
    const logs: ChartLog[] = [
      { type: "training", log_date: "2026-07-03", data: { technique: "lst" } },
      { type: "watering", log_date: "2026-07-01", data: { volume_l: 0.3 } },
    ];
    expect(eventMarkers(logs, ["training"]).map((m) => m.kind)).toEqual(["training"]);
  });
});

describe("harvestBars", () => {
  const labels = { p1: "A1", p2: "B2" };

  it("agrupa por planta y ordena de mayor a menor peso seco", () => {
    const logs: ChartLog[] = [
      { type: "cosecha", log_date: "2026-07-05", data: { dry_weight_g: 30, wet_weight_g: 120 }, plant_id: "p1" },
      { type: "cosecha", log_date: "2026-07-05", data: { dry_weight_g: 45, wet_weight_g: 180 }, plant_id: "p2" },
    ];
    const bars = harvestBars(logs, labels);
    expect(bars.map((b) => b.label)).toEqual(["B2", "A1"]);
    expect(bars[0]).toMatchObject({ dry_weight_g: 45, wet_weight_g: 180 });
  });

  it("agrupa cosechas sin planta bajo Lote y suma parciales", () => {
    const logs: ChartLog[] = [
      { type: "cosecha", log_date: "2026-07-05", data: { dry_weight_g: 20 } },
      { type: "cosecha", log_date: "2026-07-06", data: { dry_weight_g: 15 } },
    ];
    const bars = harvestBars(logs, {});
    expect(bars).toEqual([{ key: "__lote__", label: "Lote", dry_weight_g: 35, wet_weight_g: undefined }]);
  });
});

describe("hasChartableData", () => {
  it("es true si hay algún tipo graficable", () => {
    expect(hasChartableData([{ type: "watering", log_date: "2026-07-01", data: { volume_l: 1 } }])).toBe(true);
  });
  it("es false si sólo hay observaciones (texto libre, sin nada graficable)", () => {
    expect(
      hasChartableData([{ type: "observation", log_date: "2026-07-01", data: { notes: "x" } }])
    ).toBe(false);
  });
});
