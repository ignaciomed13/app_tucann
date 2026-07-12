import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cycleStatus, potAlert, PLANT_TYPE_LABELS } from "@/lib/grows/cycle";
import { VARIETY_LABELS } from "@/lib/grows/attributes";
import { CycleBadge } from "@/components/grows/cycle-badge";
import Image from "next/image";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { NotificationSettings } from "@/components/pwa/notification-settings";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: grows, error } = await supabase
    .from("grows")
    .select("id, name, genetics, plant_type, variety, plant_count, start_date, current_pot_volume_l")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <InstallPrompt />
      <NotificationSettings />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Tus cultivos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/spaces"
            className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            🏕️ Espacios
          </Link>
          <Link
            href="/dashboard/plan"
            className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            📅 Cosecha perpetua
          </Link>
          <Link
            href="/dashboard/socios"
            className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            🤝 Socios
          </Link>
          <Link
            href="/dashboard/comunidad"
            className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            💬 Comunidad
          </Link>
          <Link
            href="/dashboard/mensajes"
            className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            ✉️ Mensajes
          </Link>
          <Link
            href="/dashboard/grows/new"
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
          >
            + Nuevo cultivo
          </Link>
        </div>
      </div>

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
            Todavía no tenés cultivos. Creá el primero y Tucu te acompaña
            desde el primer brote.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {grows?.map((grow) => {
          const status = cycleStatus(
            grow.start_date,
            new Date(),
            grow.plant_type
          );
          const alert = potAlert(status, grow.current_pot_volume_l, grow.plant_type);
          return (
            <li key={grow.id}>
              <Link
                href={`/dashboard/grows/${grow.id}`}
                className="block rounded-2xl border border-[color:var(--border)] border-l-4 border-l-green-600 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold">{grow.name}</p>
                  <CycleBadge status={status} />
                  {alert && (
                    <span
                      title={alert.message}
                      className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-900 ring-1 ring-orange-300"
                    >
                      ⚠️ Maceta chica
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {grow.plant_count > 1 ? `${grow.plant_count} plantas · ` : ""}
                  {grow.genetics} · {PLANT_TYPE_LABELS[grow.plant_type]}
                  {grow.variety ? ` · ${VARIETY_LABELS[grow.variety]}` : ""} ·
                  inicio {grow.start_date} · maceta actual{" "}
                  {grow.current_pot_volume_l} L
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
