import type { PlantType } from "@/lib/supabase/database.types";

// El ciclo depende del tipo de planta:
//   - Fotoperiódica: 19 semanas (germinación → curado), admite trasplante.
//   - Autofloreciente: ciclo fijo más corto (~12 semanas). NO se trasplanta:
//     va en maceta definitiva desde el inicio para no estresarla.

export type Phase =
  | "germinacion"
  | "plantula"
  | "vegetativo"
  | "floracion"
  | "cosecha"
  | "curado";

interface PhaseDef {
  phase: Phase;
  label: string;
  fromWeek: number;
  toWeek: number;
}

interface PotThreshold {
  uptoWeek: number;
  minL: number;
}

interface CycleConfig {
  totalWeeks: number;
  phases: PhaseDef[];
  minPotByWeek: PotThreshold[];
}

const PHOTOPERIODIC: CycleConfig = {
  totalWeeks: 19,
  phases: [
    { phase: "germinacion", label: "Germinación", fromWeek: 1, toWeek: 1 },
    { phase: "plantula", label: "Plántula", fromWeek: 2, toWeek: 3 },
    { phase: "vegetativo", label: "Vegetativo", fromWeek: 4, toWeek: 9 },
    { phase: "floracion", label: "Floración", fromWeek: 10, toWeek: 17 },
    { phase: "cosecha", label: "Cosecha", fromWeek: 18, toWeek: 18 },
    { phase: "curado", label: "Curado", fromWeek: 19, toWeek: 19 },
  ],
  minPotByWeek: [
    { uptoWeek: 3, minL: 0.5 }, // germinación y plántula
    { uptoWeek: 5, minL: 3 }, // vegetativo temprano
    { uptoWeek: 9, minL: 7 }, // vegetativo tardío
    { uptoWeek: 19, minL: 11 }, // floración en adelante
  ],
};

const AUTOFLOWERING: CycleConfig = {
  totalWeeks: 12,
  phases: [
    { phase: "germinacion", label: "Germinación", fromWeek: 1, toWeek: 1 },
    { phase: "plantula", label: "Plántula", fromWeek: 2, toWeek: 3 },
    { phase: "vegetativo", label: "Vegetativo", fromWeek: 4, toWeek: 5 },
    { phase: "floracion", label: "Floración", fromWeek: 6, toWeek: 10 },
    { phase: "cosecha", label: "Cosecha", fromWeek: 11, toWeek: 11 },
    { phase: "curado", label: "Curado", fromWeek: 12, toWeek: 12 },
  ],
  // La auto debería ir en maceta definitiva desde el inicio; el umbral sube
  // rápido para señalar cuando arrancó en una maceta demasiado chica.
  minPotByWeek: [
    { uptoWeek: 2, minL: 0.5 },
    { uptoWeek: 12, minL: 11 },
  ],
};

const CONFIGS: Record<PlantType, CycleConfig> = {
  autofloreciente: AUTOFLOWERING,
  fotoperiodica: PHOTOPERIODIC,
};

export const PLANT_TYPES: { value: PlantType; label: string }[] = [
  { value: "fotoperiodica", label: "Fotoperiódica" },
  { value: "autofloreciente", label: "Autofloreciente" },
];

export const PLANT_TYPE_LABELS: Record<PlantType, string> = {
  fotoperiodica: "Fotoperiódica",
  autofloreciente: "Autofloreciente",
};

export function cycleWeeks(plantType: PlantType): number {
  return CONFIGS[plantType].totalWeeks;
}

export type CycleStatus =
  | { started: false }
  | {
      started: true;
      week: number;
      totalWeeks: number;
      phase: Phase;
      phaseLabel: string;
      finished: boolean;
    };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Semana 1-based desde start_date (YYYY-MM-DD), calculada en fechas UTC para
// que no dependa de la zona horaria del servidor.
export function cycleStatus(
  startDate: string,
  today: Date,
  plantType: PlantType
): CycleStatus {
  const cfg = CONFIGS[plantType];
  const start = new Date(`${startDate}T00:00:00Z`);
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const days = Math.floor((todayUtc - start.getTime()) / MS_PER_DAY);
  if (days < 0) return { started: false };

  const rawWeek = Math.floor(days / 7) + 1;
  const finished = rawWeek > cfg.totalWeeks;
  const week = Math.min(rawWeek, cfg.totalWeeks);

  const def = cfg.phases.find((p) => week >= p.fromWeek && week <= p.toWeek)!;
  return {
    started: true,
    week,
    totalWeeks: cfg.totalWeeks,
    phase: def.phase,
    phaseLabel: def.label,
    finished,
  };
}

export function minPotVolumeForWeek(week: number, plantType: PlantType): number {
  const list = CONFIGS[plantType].minPotByWeek;
  const entry = list.find((e) => week <= e.uptoWeek);
  return (entry ?? list[list.length - 1]).minL;
}

export interface PotAlert {
  minL: number;
  currentL: number;
  message: string;
}

export function potAlert(
  status: CycleStatus,
  currentPotVolumeL: number,
  plantType: PlantType
): PotAlert | null {
  if (!status.started || status.finished) return null;
  // Cosechada o curándose: el tamaño de maceta ya no importa.
  if (status.phase === "cosecha" || status.phase === "curado") return null;

  const minL = minPotVolumeForWeek(status.week, plantType);
  if (currentPotVolumeL >= minL) return null;

  const action =
    plantType === "autofloreciente"
      ? `Las automáticas no se trasplantan sin estrés: lo ideal es arrancar en maceta definitiva (≥${minL} L) desde el inicio.`
      : "Considerá trasplantar.";

  return {
    minL,
    currentL: currentPotVolumeL,
    message: `Maceta chica para la semana ${status.week} (${status.phaseLabel}): tenés ${currentPotVolumeL} L y se recomiendan al menos ${minL} L. ${action}`,
  };
}

// Semana en la que arranca la cosecha (fase "cosecha") según el tipo de planta.
export function harvestWeek(plantType: PlantType): number {
  return CONFIGS[plantType].phases.find((p) => p.phase === "cosecha")!.fromWeek;
}

// Fecha estimada de cosecha: inicio + (semana de cosecha - 1) * 7 días.
// Devuelve una fecha UTC a medianoche, consistente con cycleStatus.
export function estimatedHarvestDate(
  startDate: string,
  plantType: PlantType
): Date {
  const start = new Date(`${startDate}T00:00:00Z`);
  return new Date(
    start.getTime() + (harvestWeek(plantType) - 1) * 7 * MS_PER_DAY
  );
}

// Inverso: para cosechar en una fecha dada, cuándo hay que plantar.
export function startDateForHarvest(
  harvestDate: Date,
  plantType: PlantType
): Date {
  return new Date(
    harvestDate.getTime() - (harvestWeek(plantType) - 1) * 7 * MS_PER_DAY
  );
}
