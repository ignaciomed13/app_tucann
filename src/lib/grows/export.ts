import type {
  GrowEnvironment,
  HarvestLogData,
  LightType,
  LogData,
  LogType,
  PlantType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";
import {
  cycleStatus,
  estimatedHarvestDate,
  PLANT_TYPE_LABELS,
} from "@/lib/grows/cycle";
import { toISODate } from "@/lib/grows/planning";
import {
  SUBSTRATE_LABELS,
  ENVIRONMENT_LABELS,
  LIGHT_TYPE_LABELS,
  VARIETY_LABELS,
} from "@/lib/grows/attributes";
import { LOG_TYPE_LABELS } from "@/lib/logs/validation";
import { formatLogData } from "@/lib/logs/format";

// Cap de fotos por documento: sin comprimir, más que esto arriesga un PDF
// gigante y timeouts de la función serverless.
export const MAX_EXPORT_PHOTOS = 12;

export interface GrowForExport {
  name: string;
  genetics: string;
  plant_type: PlantType;
  variety: Variety | null;
  plant_count: number;
  substrate: SubstrateType;
  environment: GrowEnvironment;
  light_type: LightType | null;
  light_schedule: string | null;
  start_date: string;
  initial_pot_volume_l: number;
  current_pot_volume_l: number;
}

export interface LogForExport {
  type: LogType;
  log_date: string;
  data: LogData;
  plant_id: string | null;
}

export interface PlantForExport {
  id: string;
  label: string;
  notes: string | null;
}

export interface SpaceForExport {
  name: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number | null;
}

export interface ExportField {
  label: string;
  value: string;
}

export interface TimelineEntry {
  date: string;
  typeLabel: string;
  plantLabel: string | null;
  detail: string;
  photoCount: number;
}

export interface SelectedPhoto {
  path: string;
  date: string;
  typeLabel: string;
}

export interface HarvestSummaryData {
  lastDate: string;
  entryCount: number;
  totalDryG: number;
  totalWetG: number;
  perPlantG: number | null;
  dryYieldPct: number | null;
  ranking: { label: string; grams: number }[];
}

export interface GrowExportData {
  growName: string;
  generatedOn: string;
  cultivator: { email: string; reprocannExpiresOn: string | null };
  fields: ExportField[];
  plants: { label: string; notes: string | null }[];
  timeline: TimelineEntry[];
  photos: SelectedPhoto[];
  omittedPhotoCount: number;
  harvest: HarvestSummaryData | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function logPhotos(l: LogForExport): string[] {
  return (l.data as { photos?: string[] }).photos ?? [];
}

// Arma la estructura completa del documento a partir de datos ya resueltos.
// Pura: sin Supabase ni I/O, para poder testearla con Vitest.
export function buildGrowExportData({
  grow,
  logs,
  plants,
  space,
  email,
  reprocannExpiresOn,
  now,
}: {
  grow: GrowForExport;
  logs: LogForExport[];
  plants: PlantForExport[];
  space: SpaceForExport | null;
  email: string;
  reprocannExpiresOn: string | null;
  now: Date;
}): GrowExportData {
  const status = cycleStatus(grow.start_date, now, grow.plant_type);
  const harvestDate = estimatedHarvestDate(grow.start_date, grow.plant_type);
  const plantLabels: Record<string, string> = Object.fromEntries(
    plants.map((p) => [p.id, p.label])
  );

  const fields: ExportField[] = [
    { label: "Genética", value: grow.genetics },
    {
      label: "Tipo de planta",
      value:
        PLANT_TYPE_LABELS[grow.plant_type] +
        (grow.variety ? ` · ${VARIETY_LABELS[grow.variety]}` : ""),
    },
    { label: "Cantidad de plantas", value: String(grow.plant_count) },
    { label: "Sustrato", value: SUBSTRATE_LABELS[grow.substrate] },
    {
      label: "Ambiente",
      value:
        ENVIRONMENT_LABELS[grow.environment] +
        (grow.light_type ? ` · ${LIGHT_TYPE_LABELS[grow.light_type]}` : "") +
        (grow.light_schedule ? ` (${grow.light_schedule})` : ""),
    },
    {
      label: "Maceta",
      value:
        grow.initial_pot_volume_l === grow.current_pot_volume_l
          ? `${grow.current_pot_volume_l} L`
          : `${grow.initial_pot_volume_l} L inicial, ${grow.current_pot_volume_l} L actual`,
    },
    { label: "Fecha de inicio", value: grow.start_date },
    {
      label: "Fase actual",
      value: !status.started
        ? "Sin iniciar"
        : status.finished
          ? "Ciclo completado"
          : `${status.phaseLabel} (semana ${status.week} de ${status.totalWeeks})`,
    },
    { label: "Cosecha estimada", value: toISODate(harvestDate) },
  ];
  if (space) {
    const dims =
      `${space.width_cm}×${space.depth_cm}` +
      (space.height_cm ? `×${space.height_cm}` : "") +
      " cm";
    fields.push({ label: "Espacio", value: `${space.name} (${dims})` });
  }

  // Bitácora en orden cronológico ascendente: se lee de inicio a fin.
  const sorted = [...logs].sort((a, b) =>
    a.log_date === b.log_date ? 0 : a.log_date < b.log_date ? -1 : 1
  );

  const timeline: TimelineEntry[] = sorted.map((l) => ({
    date: l.log_date,
    typeLabel: LOG_TYPE_LABELS[l.type],
    plantLabel: l.plant_id ? (plantLabels[l.plant_id] ?? null) : null,
    detail: formatLogData(l.type, l.data),
    photoCount: logPhotos(l).length,
  }));

  // Selección de fotos: máx. 1 por log, priorizando los logs más recientes,
  // hasta MAX_EXPORT_PHOTOS en total.
  const totalPhotoCount = sorted.reduce(
    (sum, l) => sum + logPhotos(l).length,
    0
  );
  const photos: SelectedPhoto[] = [...sorted]
    .reverse()
    .filter((l) => logPhotos(l).length > 0)
    .slice(0, MAX_EXPORT_PHOTOS)
    .map((l) => ({
      path: logPhotos(l)[0],
      date: l.log_date,
      typeLabel: LOG_TYPE_LABELS[l.type],
    }));

  // Resumen de cosecha: mismos cálculos que <HarvestSummary />.
  const harvests = sorted.filter((l) => l.type === "cosecha");
  let harvest: HarvestSummaryData | null = null;
  if (harvests.length > 0) {
    const totalDry = harvests.reduce(
      (sum, h) => sum + (h.data as HarvestLogData).dry_weight_g,
      0
    );
    const totalWet = harvests.reduce(
      (sum, h) => sum + ((h.data as HarvestLogData).wet_weight_g ?? 0),
      0
    );
    const byPlant = new Map<string, number>();
    for (const h of harvests) {
      if (h.plant_id && plantLabels[h.plant_id]) {
        byPlant.set(
          h.plant_id,
          (byPlant.get(h.plant_id) ?? 0) +
            (h.data as HarvestLogData).dry_weight_g
        );
      }
    }
    harvest = {
      lastDate: harvests[harvests.length - 1].log_date,
      entryCount: harvests.length,
      totalDryG: round1(totalDry),
      totalWetG: round1(totalWet),
      perPlantG:
        grow.plant_count > 1 ? round1(totalDry / grow.plant_count) : null,
      dryYieldPct:
        totalWet > 0 ? Math.round((totalDry / totalWet) * 100) : null,
      ranking: [...byPlant.entries()]
        .map(([id, grams]) => ({ label: plantLabels[id], grams: round1(grams) }))
        .sort((a, b) => b.grams - a.grams),
    };
  }

  return {
    growName: grow.name,
    generatedOn: toISODate(now),
    cultivator: { email, reprocannExpiresOn },
    fields,
    plants: plants.map((p) => ({ label: p.label, notes: p.notes })),
    timeline,
    photos,
    omittedPhotoCount: Math.max(0, totalPhotoCount - photos.length),
    harvest,
  };
}

// Nombre de archivo seguro para Content-Disposition: sin acentos, espacios
// ni caracteres raros.
export function growExportFilename(growName: string, now: Date): string {
  const slug = growName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `bitacora-${slug || "cultivo"}-${toISODate(now)}.pdf`;
}
