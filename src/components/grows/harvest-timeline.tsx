import Link from "next/link";
import {
  cyclePhases,
  cycleWeeks,
  type Phase,
} from "@/lib/grows/cycle";
import { toISODate, type ScheduleItem } from "@/lib/grows/planning";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Posición 0–100% de un instante dentro del rango [start, end].
function pctMs(ms: number, start: number, end: number): number {
  if (end <= start) return 0;
  return Math.max(0, Math.min(100, ((ms - start) / (end - start)) * 100));
}

// Mismos colores que los badges de fase (CycleBadge).
const PHASE_COLORS: Record<Phase, string> = {
  germinacion: "bg-lime-200",
  plantula: "bg-lime-300",
  vegetativo: "bg-green-600",
  floracion: "bg-[color:var(--sun)]",
  cosecha: "bg-[color:var(--clay)]",
  curado: "bg-amber-300",
};

const PHASE_LEGEND: { phase: Phase; label: string }[] = [
  { phase: "germinacion", label: "Germinación" },
  { phase: "plantula", label: "Plántula" },
  { phase: "vegetativo", label: "Vegetativo" },
  { phase: "floracion", label: "Floración" },
  { phase: "cosecha", label: "Cosecha" },
  { phase: "curado", label: "Curado" },
];

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// Marcas de inicio de mes dentro del rango, para el eje del timeline.
function monthTicks(start: number, end: number) {
  const ticks: { key: string; label: string; pct: number }[] = [];
  const first = new Date(start);
  const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  if (d.getTime() < start) d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= end) {
    const pct = pctMs(d.getTime(), start, end);
    if (pct >= 2 && pct <= 98) {
      const yearSuffix =
        d.getUTCMonth() === 0 ? ` '${String(d.getUTCFullYear() % 100)}` : "";
      ticks.push({
        key: d.toISOString(),
        label: MONTHS_ES[d.getUTCMonth()] + yearSuffix,
        pct,
      });
    }
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return ticks;
}

/**
 * Línea de tiempo de cosecha perpetua: una barra por cultivo con el ciclo
 * completo pintado por fase, eje de meses, línea de "hoy" y futuro atenuado.
 */
export function HarvestTimeline({
  schedule,
  today,
}: {
  schedule: ScheduleItem[];
  today: Date;
}) {
  // Rango: cubre los ciclos completos (inicio → fin de curado) de todos los
  // cultivos, más hoy, con un margen para que nada toque el borde.
  const startsMs = schedule.map((s) =>
    new Date(`${s.startDate}T00:00:00Z`).getTime()
  );
  const endsMs = schedule.map(
    (s, i) => startsMs[i] + cycleWeeks(s.plantType) * 7 * MS_PER_DAY
  );
  const rawStart = Math.min(today.getTime(), ...(startsMs.length ? startsMs : [today.getTime()]));
  const rawEnd = Math.max(today.getTime(), ...(endsMs.length ? endsMs : [today.getTime()]));
  const pad = Math.max((rawEnd - rawStart) * 0.03, MS_PER_DAY);
  const rangeStart = rawStart - pad;
  const rangeEnd = rawEnd + pad;
  const todayPct = pctMs(today.getTime(), rangeStart, rangeEnd);
  const ticks = monthTicks(rangeStart, rangeEnd);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
      {/* Eje de meses */}
      <div className="relative mb-2 h-4">
        {ticks.map((t) => (
          <span
            key={t.key}
            className="absolute -translate-x-1/2 text-[10px] font-medium text-neutral-500"
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      <div className="relative flex flex-col gap-4 pb-6">
        {schedule.map((item) => (
          <PhaseTrack
            key={item.id}
            item={item}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            todayPct={todayPct}
          />
        ))}
        {/* línea de hoy cruzando todas las barras */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px border-l-2 border-dashed border-neutral-500/70"
          style={{ left: `${todayPct}%` }}
        >
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-neutral-700 px-1.5 py-px text-[9px] font-bold text-white">
            hoy
          </span>
        </div>
      </div>

      {/* Leyenda de fases */}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 border-t border-[color:var(--border)] pt-2.5 text-[10px] font-medium text-[color:var(--muted)]">
        {PHASE_LEGEND.map((p) => (
          <span key={p.phase} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[p.phase]}`} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Barra de un cultivo: el ciclo completo pintado por fase, con lo que
// todavía no pasó atenuado.
function PhaseTrack({
  item,
  rangeStart,
  rangeEnd,
  todayPct,
}: {
  item: ScheduleItem;
  rangeStart: number;
  rangeEnd: number;
  todayPct: number;
}) {
  const startMs = new Date(`${item.startDate}T00:00:00Z`).getTime();
  const endMs = startMs + cycleWeeks(item.plantType) * 7 * MS_PER_DAY;
  const left = pctMs(startMs, rangeStart, rangeEnd);
  const width = Math.max(pctMs(endMs, rangeStart, rangeEnd) - left, 0.5);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <Link
          href={`/dashboard/grows/${item.id}`}
          className="truncate font-bold text-green-800 hover:underline"
        >
          {item.name}
        </Link>
        <span className="shrink-0 text-[color:var(--muted)]">
          🌾 {toISODate(item.harvestDate)}
        </span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="absolute inset-y-0 flex overflow-hidden rounded-full"
          style={{ left: `${left}%`, width: `${width}%` }}
        >
          {cyclePhases(item.plantType).map((p) => (
            <div
              key={p.phase}
              title={`${p.label}: semanas ${p.fromWeek}–${p.toWeek}`}
              className={PHASE_COLORS[p.phase]}
              style={{ flexGrow: p.toWeek - p.fromWeek + 1, flexBasis: 0 }}
            />
          ))}
        </div>
        {/* futuro atenuado */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-white/55"
          style={{ left: `${todayPct}%` }}
        />
      </div>
    </div>
  );
}
