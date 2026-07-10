import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteSpace } from "@/lib/spaces/actions";
import { areaM2, capacityGuide, densityInfo } from "@/lib/grows/space";
import { NewSpaceForm } from "@/components/spaces/new-space-form";

export default async function SpacesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: spaces }, { data: grows }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, name, width_cm, depth_cm, height_cm")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("grows")
      .select("space_id, plant_count")
      .eq("user_id", user.id),
  ]);

  // Densidad = suma de plantas (plant_count) de todos los cultivos del espacio.
  const countBySpace = new Map<string, number>();
  for (const g of grows ?? []) {
    if (g.space_id) {
      countBySpace.set(
        g.space_id,
        (countBySpace.get(g.space_id) ?? 0) + g.plant_count
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">🏕️ Espacios</h1>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-green-700 hover:underline"
        >
          ← Tus cultivos
        </Link>
      </div>

      {spaces && spaces.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center">
          <Image
            src="/tucu.png"
            alt="Tucu, la mascota de TuCann"
            width={445}
            height={800}
            className="mx-auto h-40 w-auto"
          />
          <p className="mt-3 font-medium text-[color:var(--muted)]">
            Todavía no tenés espacios. Cargá tu carpa o armario con sus medidas
            y Tucu te dice cuántas plantas entran cómodas.
          </p>
        </div>
      )}

      {spaces && spaces.length > 0 && (
        <ul className="flex flex-col gap-3">
          {spaces.map((space) => {
            const plants = countBySpace.get(space.id) ?? 0;
            const d = densityInfo(plants, space.width_cm, space.depth_cm);
            const cap = capacityGuide(areaM2(space.width_cm, space.depth_cm));
            return (
              <li
                key={space.id}
                className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-bold">{space.name}</p>
                  <form action={deleteSpace}>
                    <input type="hidden" name="space_id" value={space.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
                <p className="text-sm text-[color:var(--muted)]">
                  {space.width_cm}×{space.depth_cm}
                  {space.height_cm ? `×${space.height_cm}` : ""} cm ·{" "}
                  {d.areaM2} m² · {plants} planta{plants === 1 ? "" : "s"} ·
                  densidad {d.perM2}/m²
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  Capacidad orientativa: ~{cap.scrog} (SCROG) · ~{cap.estandar}{" "}
                  (estándar) · ~{cap.sog} (SOG)
                </p>
                {d.overpopulated && (
                  <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-900 ring-1 ring-orange-300">
                    ⚠️ Sobrepoblado: {plants} plantas para {d.areaM2} m² (máximo
                    recomendado ~{d.maxRecommended}). Menos plantas mejoran luz y
                    ventilación.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <NewSpaceForm />
    </div>
  );
}
