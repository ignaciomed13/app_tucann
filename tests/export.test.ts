import { describe, expect, it } from "vitest";
import {
  buildGrowExportData,
  growExportFilename,
  MAX_EXPORT_PHOTOS,
  type GrowForExport,
  type LogForExport,
} from "@/lib/grows/export";

const baseGrow: GrowForExport = {
  name: "Mi cultivo",
  genetics: "Northern Lights",
  plant_type: "fotoperiodica",
  variety: "hibrida_indica",
  plant_count: 2,
  substrate: "tierra",
  environment: "interior",
  light_type: "led",
  light_schedule: "18/6",
  start_date: "2026-05-01",
  initial_pot_volume_l: 1,
  current_pot_volume_l: 11,
};

function build(overrides: {
  grow?: Partial<GrowForExport>;
  logs?: LogForExport[];
  plants?: { id: string; label: string; notes: string | null }[];
  reprocannExpiresOn?: string | null;
  now?: Date;
}) {
  return buildGrowExportData({
    grow: { ...baseGrow, ...overrides.grow },
    logs: overrides.logs ?? [],
    plants: overrides.plants ?? [],
    space: null,
    email: "test@example.com",
    reprocannExpiresOn: overrides.reprocannExpiresOn ?? null,
    now: overrides.now ?? new Date("2026-07-15T12:00:00Z"),
  });
}

function field(data: ReturnType<typeof build>, label: string): string {
  const f = data.fields.find((x) => x.label === label);
  if (!f) throw new Error(`Campo no encontrado: ${label}`);
  return f.value;
}

describe("buildGrowExportData — encabezado", () => {
  it("mapea labels de atributos y calcula fase y cosecha estimada", () => {
    const data = build({});
    expect(field(data, "Genética")).toBe("Northern Lights");
    expect(field(data, "Tipo de planta")).toBe(
      "Fotoperiódica · Híbrida (predom. índica)"
    );
    expect(field(data, "Sustrato")).toBe("Tierra");
    expect(field(data, "Ambiente")).toBe("Interior · LED (18/6)");
    expect(field(data, "Maceta")).toBe("1 L inicial, 11 L actual");
    // 2026-05-01 → 2026-07-15 = 75 días = semana 11 → floración (10-17).
    expect(field(data, "Fase actual")).toBe("Floración (semana 11 de 19)");
    // Cosecha: semana 18 → inicio + 17 semanas = 2026-08-28.
    expect(field(data, "Cosecha estimada")).toBe("2026-08-28");
    expect(data.generatedOn).toBe("2026-07-15");
    expect(data.cultivator.email).toBe("test@example.com");
  });

  it("muestra maceta única cuando no hubo trasplante", () => {
    const data = build({
      grow: { initial_pot_volume_l: 11, current_pot_volume_l: 11 },
    });
    expect(field(data, "Maceta")).toBe("11 L");
  });

  it("incluye el vencimiento REPROCANN cuando está cargado", () => {
    const data = build({ reprocannExpiresOn: "2026-12-01" });
    expect(data.cultivator.reprocannExpiresOn).toBe("2026-12-01");
  });
});

describe("buildGrowExportData — línea de tiempo", () => {
  it("ordena ascendente por fecha y formatea el detalle por tipo", () => {
    const data = build({
      logs: [
        {
          type: "watering",
          log_date: "2026-05-10",
          data: { volume_l: 1.5 },
          plant_id: null,
        },
        {
          type: "observation",
          log_date: "2026-05-02",
          data: { notes: "Brotó bien" },
          plant_id: null,
        },
      ],
    });
    expect(data.timeline.map((t) => t.date)).toEqual([
      "2026-05-02",
      "2026-05-10",
    ]);
    expect(data.timeline[0].typeLabel).toBe("Observaciones");
    expect(data.timeline[0].detail).toBe("Brotó bien");
    expect(data.timeline[1].typeLabel).toBe("Riego");
    expect(data.timeline[1].detail).toBe("1.5 L aplicados");
  });

  it("anota la etiqueta de planta cuando el log es de un individuo", () => {
    const data = build({
      plants: [{ id: "p1", label: "Planta A", notes: null }],
      logs: [
        {
          type: "training",
          log_date: "2026-06-01",
          data: { technique: "lst" },
          plant_id: "p1",
        },
      ],
    });
    expect(data.timeline[0].plantLabel).toBe("Planta A");
    expect(data.timeline[0].detail).toBe(
      "LST (entrenamiento de bajo estrés)"
    );
  });
});

describe("buildGrowExportData — resumen de cosecha", () => {
  it("es null sin logs de cosecha", () => {
    expect(build({}).harvest).toBeNull();
  });

  it("suma cosechas parciales, calcula merma y ranking por planta", () => {
    const data = build({
      plants: [
        { id: "p1", label: "Planta A", notes: null },
        { id: "p2", label: "Planta B", notes: null },
      ],
      logs: [
        {
          type: "cosecha",
          log_date: "2026-08-20",
          data: { dry_weight_g: 30, wet_weight_g: 120 },
          plant_id: "p1",
        },
        {
          type: "cosecha",
          log_date: "2026-08-25",
          data: { dry_weight_g: 50, wet_weight_g: 200 },
          plant_id: "p2",
        },
      ],
    });
    expect(data.harvest).not.toBeNull();
    expect(data.harvest!.totalDryG).toBe(80);
    expect(data.harvest!.totalWetG).toBe(320);
    expect(data.harvest!.perPlantG).toBe(40); // 80 g / 2 plantas
    expect(data.harvest!.dryYieldPct).toBe(25); // 80/320
    expect(data.harvest!.lastDate).toBe("2026-08-25");
    expect(data.harvest!.entryCount).toBe(2);
    expect(data.harvest!.ranking).toEqual([
      { label: "Planta B", grams: 50 },
      { label: "Planta A", grams: 30 },
    ]);
  });

  it("no calcula merma si no hay peso en fresco", () => {
    const data = build({
      logs: [
        {
          type: "cosecha",
          log_date: "2026-08-20",
          data: { dry_weight_g: 30 },
          plant_id: null,
        },
      ],
    });
    expect(data.harvest!.dryYieldPct).toBeNull();
  });
});

describe("buildGrowExportData — selección de fotos", () => {
  function logWithPhotos(date: string, photos: string[]): LogForExport {
    return {
      type: "observation",
      log_date: date,
      data: { notes: "obs", photos },
      plant_id: null,
    };
  }

  it("incluye 1 foto por log, priorizando los más recientes", () => {
    const data = build({
      logs: [
        logWithPhotos("2026-05-01", ["a1.jpg", "a2.jpg"]),
        logWithPhotos("2026-05-02", ["b1.jpg"]),
      ],
    });
    // Máx. 1 por log: a2.jpg queda afuera aunque el cap no se alcanzó.
    expect(data.photos.map((p) => p.path)).toEqual(["b1.jpg", "a1.jpg"]);
    expect(data.omittedPhotoCount).toBe(1);
    expect(data.timeline[0].photoCount).toBe(2);
  });

  it("respeta el cap total de fotos y cuenta las omitidas", () => {
    const logs = Array.from({ length: 20 }, (_, i) =>
      logWithPhotos(
        `2026-05-${String(i + 1).padStart(2, "0")}`,
        [`foto-${i + 1}.jpg`]
      )
    );
    const data = build({ logs });
    expect(data.photos).toHaveLength(MAX_EXPORT_PHOTOS);
    // Los más recientes primero: día 20, 19, …
    expect(data.photos[0].path).toBe("foto-20.jpg");
    expect(data.omittedPhotoCount).toBe(20 - MAX_EXPORT_PHOTOS);
  });

  it("sin fotos: lista vacía y cero omitidas", () => {
    const data = build({
      logs: [
        {
          type: "watering",
          log_date: "2026-05-10",
          data: { volume_l: 1 },
          plant_id: null,
        },
      ],
    });
    expect(data.photos).toEqual([]);
    expect(data.omittedPhotoCount).toBe(0);
  });
});

describe("growExportFilename", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("normaliza acentos, espacios y caracteres raros", () => {
    expect(growExportFilename("Cultivo Ñandú #1 (interior)", now)).toBe(
      "bitacora-cultivo-nandu-1-interior-2026-07-15.pdf"
    );
  });

  it("cae a 'cultivo' si el nombre no deja nada usable", () => {
    expect(growExportFilename("🌱🌱🌱", now)).toBe(
      "bitacora-cultivo-2026-07-15.pdf"
    );
  });
});
