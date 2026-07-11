import type { LogType } from "@/lib/supabase/database.types";

// Lógica pura para derivar las series de los gráficos del cultivo a partir de
// los logs. Sin dependencias de React ni de recharts: todo esto se testea con
// Vitest (ver tests/charts.test.ts). El componente cliente sólo consume estas
// estructuras y las mapea a <Line>/<Bar>.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export { MS_PER_DAY };

// Log mínimo que necesitan los gráficos (subset de la fila de `logs`).
export interface ChartLog {
  type: LogType;
  log_date: string;
  data: Record<string, unknown> | null;
  plant_id?: string | null;
}

// Fecha YYYY-MM-DD → timestamp UTC a medianoche. Consistente con el resto de
// la app (cycle.ts, harvest-timeline.tsx), que trabaja siempre en UTC para no
// depender de la zona horaria del server.
export function dateToTs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

// Lee un campo numérico de `data`, o undefined si no es un número finito.
function num(data: Record<string, unknown> | null, key: string): number | undefined {
  const v = data?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

// Promedio de una lista (asume no vacía).
function avg(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

// Redondea a 1 decimal para no arrastrar ruido del promedio.
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Ambiente (tendencias): serie temporal a nivel lote.
// ---------------------------------------------------------------------------

export type EnvMetric = "temperature_c" | "humidity_pct" | "ec" | "ph";

export const ENV_METRICS: EnvMetric[] = [
  "temperature_c",
  "humidity_pct",
  "ec",
  "ph",
];

export interface EnvRow {
  t: number;
  date: string;
  temperature_c?: number;
  humidity_pct?: number;
  ec?: number;
  ph?: number;
}

/**
 * Serie ambiental agregada por fecha (ignora plant_id: temp/humedad/EC/pH del
 * ambiente son compartidos por el lote). Si hay varias lecturas el mismo día,
 * promedia cada métrica por separado. Ordenada ascendente por fecha.
 */
export function environmentalSeries(logs: ChartLog[]): EnvRow[] {
  const byDate = new Map<string, Record<EnvMetric, number[]>>();

  for (const log of logs) {
    if (log.type !== "environmental") continue;
    let bucket = byDate.get(log.log_date);
    if (!bucket) {
      bucket = { temperature_c: [], humidity_pct: [], ec: [], ph: [] };
      byDate.set(log.log_date, bucket);
    }
    for (const m of ENV_METRICS) {
      const v = num(log.data, m);
      if (v !== undefined) bucket[m].push(v);
    }
  }

  return [...byDate.entries()]
    .map(([date, bucket]) => {
      const row: EnvRow = { t: dateToTs(date), date };
      for (const m of ENV_METRICS) {
        if (bucket[m].length > 0) row[m] = round1(avg(bucket[m]));
      }
      return row;
    })
    .sort((a, b) => a.t - b.t);
}

// Métricas ambientales que efectivamente tienen al menos un dato en la serie.
export function presentEnvMetrics(rows: EnvRow[]): EnvMetric[] {
  return ENV_METRICS.filter((m) => rows.some((r) => r[m] !== undefined));
}

// ---------------------------------------------------------------------------
// Ambiente por planta (fenohunting): una curva por planta para una métrica.
// ---------------------------------------------------------------------------

export interface PlantEnvSeries {
  metric: EnvMetric;
  labels: string[]; // etiquetas de planta presentes, ordenadas
  rows: Array<Record<string, number>>; // { t, date, [label]: value }
}

/**
 * Serie de una métrica ambiental desglosada por planta individual. Sólo tiene
 * sentido cuando al menos 2 plantas tienen lecturas de esa métrica (si no,
 * devuelve null y se usa la serie de lote). Promedia por planta y fecha.
 */
export function environmentalByPlant(
  logs: ChartLog[],
  metric: EnvMetric,
  plantLabels: Record<string, string>
): PlantEnvSeries | null {
  // date → label → valores
  const byDate = new Map<string, Map<string, number[]>>();
  const labelsSeen = new Set<string>();

  for (const log of logs) {
    if (log.type !== "environmental") continue;
    if (!log.plant_id) continue;
    const label = plantLabels[log.plant_id];
    if (!label) continue;
    const v = num(log.data, metric);
    if (v === undefined) continue;

    labelsSeen.add(label);
    let row = byDate.get(log.log_date);
    if (!row) {
      row = new Map();
      byDate.set(log.log_date, row);
    }
    const arr = row.get(label) ?? [];
    arr.push(v);
    row.set(label, arr);
  }

  if (labelsSeen.size < 2) return null;

  const labels = [...labelsSeen].sort();
  const rows = [...byDate.entries()]
    .map(([date, row]) => {
      const out: Record<string, number> = { t: dateToTs(date) };
      for (const label of labels) {
        const arr = row.get(label);
        if (arr && arr.length > 0) out[label] = round1(avg(arr));
      }
      return { ...out, date } as Record<string, number> & { date: string };
    })
    .sort((a, b) => (a.t as number) - (b.t as number));

  return { metric, labels, rows };
}

// ---------------------------------------------------------------------------
// Riego: barras de volumen por fecha (suma si hay varios riegos el mismo día).
// ---------------------------------------------------------------------------

export interface WateringBar {
  t: number;
  date: string;
  volume_l: number;
}

export function wateringSeries(logs: ChartLog[]): WateringBar[] {
  const byDate = new Map<string, number>();
  for (const log of logs) {
    if (log.type !== "watering") continue;
    const v = num(log.data, "volume_l");
    if (v === undefined) continue;
    byDate.set(log.log_date, (byDate.get(log.log_date) ?? 0) + v);
  }
  return [...byDate.entries()]
    .map(([date, volume_l]) => ({ t: dateToTs(date), date, volume_l: round1(volume_l) }))
    .sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------------------
// Volumen de maceta: escalones (inicio + cada trasplante).
// ---------------------------------------------------------------------------

export interface PotStep {
  t: number;
  date: string;
  volume_l: number;
}

/**
 * Evolución del tamaño de maceta como escalones: arranca en el volumen inicial
 * en la fecha de inicio y sube en cada trasplante. Devuelve null si no hubo
 * ningún trasplante (una maceta constante no aporta como gráfico).
 */
export function potVolumeSteps(
  logs: ChartLog[],
  initialVolumeL: number,
  startDate: string
): PotStep[] | null {
  const transplants = logs
    .filter((l) => l.type === "transplant")
    .map((l) => ({ date: l.log_date, volume_l: num(l.data, "new_volume_l") }))
    .filter((l): l is { date: string; volume_l: number } => l.volume_l !== undefined)
    .sort((a, b) => dateToTs(a.date) - dateToTs(b.date));

  if (transplants.length === 0) return null;

  const steps: PotStep[] = [
    { t: dateToTs(startDate), date: startDate, volume_l: initialVolumeL },
  ];
  for (const tr of transplants) {
    steps.push({ t: dateToTs(tr.date), date: tr.date, volume_l: tr.volume_l });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Anotaciones: eventos puntuales (poda, trasplante, sanidad, nutrición…) que
// se dibujan como líneas verticales sobre el gráfico de ambiente.
// ---------------------------------------------------------------------------

export type EventKind =
  | "watering"
  | "nutrition"
  | "training"
  | "sanidad"
  | "transplant";

export interface ChartEvent {
  t: number;
  date: string;
  kind: EventKind;
  emoji: string;
}

// Tipos de log que valen como anotación (los numéricos con gráfico propio, como
// cosecha, y las observaciones de texto libre, quedan afuera).
const EVENT_EMOJI: Record<EventKind, string> = {
  watering: "💧",
  nutrition: "🧪",
  training: "✂️",
  sanidad: "🐛",
  transplant: "🪴",
};

const EVENT_KINDS = new Set<string>(Object.keys(EVENT_EMOJI));

/**
 * Marcadores de eventos para anotar el gráfico de ambiente. Ordenados por
 * fecha. `kinds` permite filtrar (por defecto todos los soportados).
 */
export function eventMarkers(
  logs: ChartLog[],
  kinds: EventKind[] = [...EVENT_KINDS] as EventKind[]
): ChartEvent[] {
  const allowed = new Set<string>(kinds);
  return logs
    .filter((l) => EVENT_KINDS.has(l.type) && allowed.has(l.type))
    .map((l) => ({
      t: dateToTs(l.log_date),
      date: l.log_date,
      kind: l.type as EventKind,
      emoji: EVENT_EMOJI[l.type as EventKind],
    }))
    .sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------------------
// Cosecha: barras de peso seco por planta (o total si no hay desglose).
// ---------------------------------------------------------------------------

export interface HarvestBar {
  key: string;
  label: string;
  dry_weight_g: number;
  wet_weight_g?: number;
}

/**
 * Barras de cosecha. Si hay cosechas asignadas a plantas individuales, agrupa
 * por planta (fenohunting: compara rendimiento entre fenotipos). Las cosechas
 * sin planta se agrupan bajo "Lote". Ordenadas de mayor a menor peso seco.
 */
export function harvestBars(
  logs: ChartLog[],
  plantLabels: Record<string, string>
): HarvestBar[] {
  const dry = new Map<string, number>();
  const wet = new Map<string, number>();

  for (const log of logs) {
    if (log.type !== "cosecha") continue;
    const d = num(log.data, "dry_weight_g");
    if (d === undefined) continue;
    const w = num(log.data, "wet_weight_g");
    const key = (log.plant_id && plantLabels[log.plant_id]) || "__lote__";
    dry.set(key, (dry.get(key) ?? 0) + d);
    if (w !== undefined) wet.set(key, (wet.get(key) ?? 0) + w);
  }

  return [...dry.entries()]
    .map(([key, dry_weight_g]) => ({
      key,
      label: key === "__lote__" ? "Lote" : plantLabels[key] ?? key,
      dry_weight_g: round1(dry_weight_g),
      wet_weight_g: wet.has(key) ? round1(wet.get(key)!) : undefined,
    }))
    .sort((a, b) => b.dry_weight_g - a.dry_weight_g);
}

// ¿Vale la pena mostrar la sección de gráficas? (hay algo graficable)
export function hasChartableData(logs: ChartLog[]): boolean {
  return logs.some(
    (l) =>
      l.type === "environmental" ||
      l.type === "watering" ||
      l.type === "transplant" ||
      l.type === "cosecha" ||
      EVENT_KINDS.has(l.type)
  );
}
