import Link from "next/link";
import Image from "next/image";
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
import { HarvestTimeline } from "@/components/grows/harvest-timeline";

function daysLabel(n: number): string {
  if (n === 0) return "hoy";
  if (n > 0) return `en ${n} días`;
  return `hace ${-n} días`;
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
        <div className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center">
          <Image
            src="/tucu.png"
            alt="Tucu, la mascota de TuCann"
            width={445}
            height={800}
            className="mx-auto h-40 w-auto"
          />
          <p className="mt-3 font-medium text-[color:var(--muted)]">
            Todavía no tenés cultivos. Creá el primero para empezar a planificar
            tu producción escalonada.
          </p>
        </div>
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
            <HarvestTimeline schedule={schedule} today={today} />
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
