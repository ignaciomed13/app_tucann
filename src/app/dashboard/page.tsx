import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cycleStatus, potAlert, PLANT_TYPE_LABELS } from "@/lib/grows/cycle";
import { CycleBadge } from "@/components/grows/cycle-badge";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: grows, error } = await supabase
    .from("grows")
    .select("id, name, genetics, plant_type, start_date, current_pot_volume_l")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Tus cultivos</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/plan"
            className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            📅 Cosecha perpetua
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
          <p className="text-4xl">🌱</p>
          <p className="mt-2 font-medium text-[color:var(--muted)]">
            Todavía no tenés cultivos. Creá el primero para empezar a registrar
            logs.
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
                      className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300"
                    >
                      ⚠️ Maceta chica
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {grow.genetics} · {PLANT_TYPE_LABELS[grow.plant_type]} ·
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
