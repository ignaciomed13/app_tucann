import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cycleStatus, PLANT_TYPE_LABELS } from "@/lib/grows/cycle";
import {
  buildSchedule,
  daysUntil,
  toISODate,
  type ScheduleItem,
} from "@/lib/grows/planning";
import { PerpetualPlanner } from "@/components/grows/perpetual-planner";

function daysLabel(n: number): string {
  if (n === 0) return "hoy";
  if (n > 0) return `en ${n} días`;
  return `hace ${-n} días`;
}

// Posición 0–100% de una fecha dentro del rango [start, end].
function pct(date: Date, start: number, end: number): number {
  if (end <= start) return 0;
  const p = ((date.getTime() - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, p));
}

export default async function PlanPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = new Date();

  const { data: grows } = await supabase
    .from("grows")
    .select("id, name, plant_type, start_date")
    .eq("user_id", user.id);

  const schedule = buildSchedule(grows ?? []);

  // Rango del timeline: desde hoy (o la cosecha más temprana) hasta la más tardía.
  const times = schedule.map((s) => s.harvestDate.getTime());
  const rangeStart = Math.min(today.getTime(), ...(times.length ? times : [today.getTime()]));
  const rangeEnd = Math.max(today.getTime(), ...(times.length ? times : [today.getTime()]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          📅 Cosecha perpetua
        </h1>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-green-700 hover:underline"
        >
          ← Tus cultivos
        </Link>
      </div>

      {schedule.length === 0 ? (
        <p className="text-neutral-600">
          Todavía no tenés cultivos. Creá el primero para empezar a planificar tu
          producción escalonada.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Próximas cosechas</h2>
            <ul className="flex flex-col gap-2">
              {schedule.map((item) => (
                <HarvestRow key={item.id} item={item} today={today} />
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Línea de tiempo</h2>
            <div className="relative h-16 rounded-xl border border-[color:var(--border)] bg-white shadow-sm">
              {/* marcador de hoy */}
              <div
                className="absolute top-0 bottom-0 w-px bg-neutral-400"
                style={{ left: `${pct(today, rangeStart, rangeEnd)}%` }}
              >
                <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-neutral-500">
                  hoy
                </span>
              </div>
              {schedule.map((item) => (
                <div
                  key={item.id}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pct(item.harvestDate, rangeStart, rangeEnd)}%` }}
                  title={`${item.name} — cosecha ${toISODate(item.harvestDate)}`}
                >
                  <div className="h-3 w-3 rounded-full bg-green-600" />
                  <span className="absolute left-1/2 top-4 w-20 -translate-x-1/2 truncate text-center text-[10px] text-neutral-600">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <PerpetualPlanner
        harvestDatesIso={schedule.map((s) => toISODate(s.harvestDate))}
      />
    </div>
  );
}

function HarvestRow({ item, today }: { item: ScheduleItem; today: Date }) {
  const status = cycleStatus(item.startDate, today, item.plantType);
  const dLeft = daysUntil(item.harvestDate, today);
  const progress =
    status.started && !status.finished
      ? Math.round((status.week / status.totalWeeks) * 100)
      : status.started
        ? 100
        : 0;

  return (
    <li className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/dashboard/grows/${item.id}`}
          className="font-bold text-green-800 hover:underline"
        >
          {item.name}
        </Link>
        <span className="text-sm font-medium text-[color:var(--muted)]">
          🌾 {toISODate(item.harvestDate)} · {daysLabel(dLeft)}
        </span>
      </div>
      <p className="text-xs text-[color:var(--muted)]">
        {PLANT_TYPE_LABELS[item.plantType]}
        {status.started
          ? ` · Semana ${status.week}/${status.totalWeeks} · ${status.phaseLabel}`
          : " · sin iniciar"}
      </p>
      <div className="mt-2 h-2 w-full rounded-full bg-neutral-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-green-500 to-lime-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </li>
  );
}
