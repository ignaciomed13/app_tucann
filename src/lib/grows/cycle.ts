import type { PlantOrigin, PlantType } from "@/lib/supabase/database.types";

// El ciclo depende del tipo de planta Y del origen:
//   - Fotoperiódica de semilla: 19 semanas (germinación → curado), admite
//     trasplante.
//   - Fotoperiódica de esqueje: 17 semanas. No germina: enraíza (2 semanas
//     bajo cúpula) y arranca vegetativo con tejido adulto, así que llega antes
//     a floración.
//   - Autofloreciente: ciclo fijo más corto (~12 semanas). NO se trasplanta:
//     va en maceta definitiva desde el inicio para no estresarla. Tampoco se
//     clona: el esqueje hereda la edad de la madre y florece sin rendir.

export type Phase =
  | "enraizamiento"
  | "germinacion"
  | "plantula"
  | "vegetativo"
  | "floracion"
  | "cosecha"
  | "curado";

export interface PhaseDef {
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

// Tipo + origen: todo lo que define el ciclo de un cultivo. Se pasa entero
// porque casi siempre viene de una fila de `grows`.
export interface CycleSpec {
  plant_type: PlantType;
  origin: PlantOrigin;
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

const PHOTOPERIODIC_CUTTING: CycleConfig = {
  totalWeeks: 17,
  phases: [
    { phase: "enraizamiento", label: "Enraizamiento", fromWeek: 1, toWeek: 2 },
    { phase: "vegetativo", label: "Vegetativo", fromWeek: 3, toWeek: 7 },
    { phase: "floracion", label: "Floración", fromWeek: 8, toWeek: 15 },
    { phase: "cosecha", label: "Cosecha", fromWeek: 16, toWeek: 16 },
    { phase: "curado", label: "Curado", fromWeek: 17, toWeek: 17 },
  ],
  // Mientras enraíza va en cubo o vasito chico; una vez con raíces se
  // trasplanta y a partir de ahí el umbral es el de cualquier fotoperiódica.
  minPotByWeek: [
    { uptoWeek: 2, minL: 0.3 }, // enraizamiento
    { uptoWeek: 3, minL: 3 }, // recién trasplantado
    { uptoWeek: 7, minL: 7 }, // vegetativo
    { uptoWeek: 17, minL: 11 }, // floración en adelante
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

// Una auto de esqueje no debería existir (lo bloquean el form y un check en la
// base), pero si aparece una fila vieja o inconsistente cae en el ciclo de auto
// en vez de romper.
function configFor(spec: CycleSpec): CycleConfig {
  if (spec.plant_type === "autofloreciente") return AUTOFLOWERING;
  return spec.origin === "esqueje" ? PHOTOPERIODIC_CUTTING : PHOTOPERIODIC;
}

export const PLANT_TYPES: { value: PlantType; label: string }[] = [
  { value: "fotoperiodica", label: "Fotoperiódica" },
  { value: "autofloreciente", label: "Autofloreciente" },
];

export const PLANT_TYPE_LABELS: Record<PlantType, string> = {
  fotoperiodica: "Fotoperiódica",
  autofloreciente: "Autofloreciente",
};

export const PLANT_ORIGINS: { value: PlantOrigin; label: string }[] = [
  { value: "semilla", label: "Semilla" },
  { value: "esqueje", label: "Esqueje" },
];

export const PLANT_ORIGIN_LABELS: Record<PlantOrigin, string> = {
  semilla: "De semilla",
  esqueje: "De esqueje",
};

// Etiqueta corta para cards y encabezados: el origen solo se aclara cuando es
// esqueje, porque de semilla es el caso por defecto.
export function plantLabel(spec: CycleSpec): string {
  const base = PLANT_TYPE_LABELS[spec.plant_type];
  return spec.origin === "esqueje" ? `${base} (esqueje)` : base;
}

// Las autos no se clonan: el esqueje hereda la edad de la madre.
export function canBeCutting(plantType: PlantType): boolean {
  return plantType === "fotoperiodica";
}

export function cycleWeeks(spec: CycleSpec): number {
  return configFor(spec).totalWeeks;
}

// Fases del ciclo en orden, para visualizaciones tipo línea de tiempo.
export function cyclePhases(spec: CycleSpec): PhaseDef[] {
  return configFor(spec).phases;
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
// que no dependa de la zona horaria del servidor. En un esqueje, start_date es
// el día del corte.
export function cycleStatus(
  startDate: string,
  today: Date,
  spec: CycleSpec
): CycleStatus {
  const cfg = configFor(spec);
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

export function minPotVolumeForWeek(week: number, spec: CycleSpec): number {
  const list = configFor(spec).minPotByWeek;
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
  spec: CycleSpec
): PotAlert | null {
  if (!status.started || status.finished) return null;
  // Cosechada o curándose: el tamaño de maceta ya no importa.
  if (status.phase === "cosecha" || status.phase === "curado") return null;
  // Todavía enraizando: va en cubo o vasito, la maceta viene después.
  if (status.phase === "enraizamiento") return null;

  const minL = minPotVolumeForWeek(status.week, spec);
  if (currentPotVolumeL >= minL) return null;

  const action =
    spec.plant_type === "autofloreciente"
      ? `Las automáticas no se trasplantan sin estrés: lo ideal es arrancar en maceta definitiva (≥${minL} L) desde el inicio.`
      : "Considerá trasplantar.";

  return {
    minL,
    currentL: currentPotVolumeL,
    message: `Maceta chica para la semana ${status.week} (${status.phaseLabel}): tenés ${currentPotVolumeL} L y se recomiendan al menos ${minL} L. ${action}`,
  };
}

// Semana en la que arranca la cosecha (fase "cosecha") según el ciclo.
export function harvestWeek(spec: CycleSpec): number {
  return configFor(spec).phases.find((p) => p.phase === "cosecha")!.fromWeek;
}

// Fecha estimada de cosecha: inicio + (semana de cosecha - 1) * 7 días.
// Devuelve una fecha UTC a medianoche, consistente con cycleStatus.
export function estimatedHarvestDate(startDate: string, spec: CycleSpec): Date {
  const start = new Date(`${startDate}T00:00:00Z`);
  return new Date(start.getTime() + (harvestWeek(spec) - 1) * 7 * MS_PER_DAY);
}

// Inverso: para cosechar en una fecha dada, cuándo hay que plantar (o cortar
// el esqueje).
export function startDateForHarvest(harvestDate: Date, spec: CycleSpec): Date {
  return new Date(
    harvestDate.getTime() - (harvestWeek(spec) - 1) * 7 * MS_PER_DAY
  );
}
