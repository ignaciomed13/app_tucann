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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tus cultivos</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/plan"
            className="rounded border border-green-700 px-3 py-2 text-sm font-medium text-green-800"
          >
            Cosecha perpetua
          </Link>
          <Link
            href="/dashboard/grows/new"
            className="rounded bg-green-700 px-3 py-2 text-sm font-medium text-white"
          >
            + Nuevo cultivo
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {grows && grows.length === 0 && (
        <p className="text-neutral-600">
          Todavía no tenés cultivos. Creá el primero para empezar a registrar
          logs.
        </p>
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
                className="block rounded border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium">{grow.name}</p>
                  <CycleBadge status={status} />
                  {alert && (
                    <span
                      title={alert.message}
                      className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    >
                      ⚠️ Maceta chica
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-600">
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
