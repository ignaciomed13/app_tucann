import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  cycleStatus,
  estimatedHarvestDate,
  potAlert,
  PLANT_TYPE_LABELS,
} from "@/lib/grows/cycle";
import { daysUntil } from "@/lib/grows/planning";
import { PHASE_ACCENT } from "@/lib/grows/phase-colors";
import { SUBSTRATE_LABELS } from "@/lib/grows/attributes";
import { CycleBadge } from "@/components/grows/cycle-badge";
import { Hero, HeroStat } from "@/components/ui/hero";
import Image from "next/image";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { NotificationSettings } from "@/components/pwa/notification-settings";

const NAV = [
  { href: "/dashboard/spaces", label: "🏕️ Espacios" },
  { href: "/dashboard/plan", label: "📅 Cosecha perpetua" },
  { href: "/dashboard/socios", label: "🤝 Socios" },
  { href: "/dashboard/comunidad", label: "💬 Comunidad" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: grows, error }, { count: unreadDms }] = await Promise.all([
    supabase
      .from("grows")
      .select(
        "id, name, genetics, plant_type, variety, plant_count, substrate, start_date, current_pot_volume_l"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  const now = new Date();

  // Cosecha más cercana entre los cultivos que todavía no la alcanzaron.
  const upcoming = (grows ?? [])
    .map((g) => daysUntil(estimatedHarvestDate(g.start_date, g.plant_type), now))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);
  const nextHarvestDays = upcoming[0];

  return (
    <div className="flex flex-col gap-4">
      <Hero
        title="Tus cultivos"
        chip={
          nextHarvestDays !== undefined ? (
            <HeroStat
              label="🌾 Cosecha más cercana"
              value={
                nextHarvestDays === 0 ? "hoy" : `en ${nextHarvestDays} días`
              }
            />
          ) : undefined
        }
      />

      <InstallPrompt />
      <NotificationSettings />

      <div className="flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border-[1.5px] border-green-700 px-3.5 py-2 text-xs font-bold text-green-800 transition hover:bg-green-50"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/dashboard/mensajes"
          className="relative rounded-full border-[1.5px] border-green-700 px-3.5 py-2 text-xs font-bold text-green-800 transition hover:bg-green-50"
        >
          ✉️ Mensajes
          {(unreadDms ?? 0) > 0 && (
            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[color:var(--clay)] px-1.5 py-px text-[10px] font-extrabold text-white">
              {unreadDms}
            </span>
          )}
        </Link>
      </div>

      <Link
        href="/dashboard/grows/new"
        className="rounded-full bg-green-700 px-4 py-3 text-center text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(21,128,61,.25)] transition hover:bg-green-800"
      >
        + Nuevo cultivo
      </Link>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {grows && grows.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center">
          <Image
            src="/tucu.png"
            alt="Tucu, la mascota de TuCann"
            width={1024}
            height={1536}
            className="mx-auto h-40 w-auto"
          />
          <p className="mt-3 font-medium text-[color:var(--muted)]">
            Todavía no tenés cultivos. Creá el primero y Tucu te acompaña desde
            el primer brote.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {grows?.map((grow) => {
          const status = cycleStatus(grow.start_date, now, grow.plant_type);
          const alert = potAlert(
            status,
            grow.current_pot_volume_l,
            grow.plant_type
          );
          const harvestDays = daysUntil(
            estimatedHarvestDate(grow.start_date, grow.plant_type),
            now
          );
          const accent = status.started
            ? PHASE_ACCENT[status.phase]
            : "var(--border)";
          const progress = status.started
            ? Math.min(100, Math.round((status.week / status.totalWeeks) * 100))
            : 0;

          return (
            <li key={grow.id}>
              <Link
                href={`/dashboard/grows/${grow.id}`}
                style={{ borderLeftColor: accent }}
                className="block rounded-2xl border border-[color:var(--border)] border-l-4 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-extrabold">{grow.name}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {alert && (
                      <span
                        title={alert.message}
                        className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-extrabold text-orange-900 ring-1 ring-orange-300"
                      >
                        ⚠️
                      </span>
                    )}
                    <CycleBadge status={status} compact />
                  </div>
                </div>

                <p className="mt-1 mb-2 text-xs text-[color:var(--muted)]">
                  {grow.plant_count > 1
                    ? `${grow.plant_count} plantas · `
                    : ""}
                  {grow.genetics} · {PLANT_TYPE_LABELS[grow.plant_type]} ·{" "}
                  {SUBSTRATE_LABELS[grow.substrate]} · maceta{" "}
                  {grow.current_pot_volume_l} L
                </p>

                <div className="h-[5px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: accent }}
                  />
                </div>

                <p className="mt-1.5 text-[11px] text-[color:var(--faint)]">
                  {status.started
                    ? `Semana ${status.week} de ${status.totalWeeks}`
                    : "Todavía no arrancó"}
                  {harvestDays >= 0
                    ? ` · cosecha en ${harvestDays} días`
                    : ` · cosecha estimada hace ${-harvestDays} días`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
