import type { HarvestLogData } from "@/lib/supabase/database.types";

export interface HarvestEntry {
  log_date: string;
  data: HarvestLogData;
  plant_id?: string | null;
}

// Redondea a 1 decimal, sin ceros de más.
function g(n: number): string {
  return `${Math.round(n * 10) / 10} g`;
}

/**
 * Resumen de cosecha: total de peso seco (sumando cosechas parciales),
 * gramos por planta y merma fresco→seco. Solo se muestra si hay al menos
 * un log de cosecha. La fecha es la de la última cosecha registrada.
 */
export function HarvestSummary({
  harvests,
  plantCount,
  plantLabels = {},
}: {
  harvests: HarvestEntry[];
  plantCount: number;
  plantLabels?: Record<string, string>;
}) {
  if (harvests.length === 0) return null;

  const totalDry = harvests.reduce((sum, h) => sum + h.data.dry_weight_g, 0);
  const totalWet = harvests.reduce(
    (sum, h) => sum + (h.data.wet_weight_g ?? 0),
    0
  );
  const lastDate = harvests
    .map((h) => h.log_date)
    .sort()
    .at(-1);
  const perPlant = plantCount > 0 ? totalDry / plantCount : null;
  // Rendimiento de secado: cuánto del peso fresco quedó tras el secado.
  const dryYield = totalWet > 0 ? (totalDry / totalWet) * 100 : null;

  // Desglose por planta: peso seco de las cosechas asignadas a una planta,
  // para comparar fenotipos (fenohunting). Ordenado de mayor a menor.
  const byPlant = new Map<string, number>();
  for (const h of harvests) {
    if (h.plant_id && plantLabels[h.plant_id]) {
      byPlant.set(
        h.plant_id,
        (byPlant.get(h.plant_id) ?? 0) + h.data.dry_weight_g
      );
    }
  }
  const phenoRanking = [...byPlant.entries()]
    .map(([id, grams]) => ({ label: plantLabels[id], grams }))
    .sort((a, b) => b.grams - a.grams);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50/60 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        🌾 Cosecha registrada
        {lastDate && (
          <span className="text-sm font-normal text-[color:var(--muted)]">
            · {lastDate}
          </span>
        )}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Peso seco total" value={g(totalDry)} />
        {perPlant !== null && plantCount > 1 && (
          <Stat label="Por planta" value={g(perPlant)} />
        )}
        {dryYield !== null && (
          <Stat label="Merma de secado" value={`${Math.round(dryYield)}%`} />
        )}
      </div>
      {phenoRanking.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Rendimiento por planta
          </p>
          <ul className="flex flex-col gap-1">
            {phenoRanking.map((p, i) => (
              <li
                key={p.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-[color:var(--ink)]">
                  {i === 0 ? "🏆 " : ""}
                  {p.label}
                </span>
                <span className="font-bold text-amber-900">{g(p.grams)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {harvests.length > 1 && (
        <p className="text-xs text-[color:var(--muted)]">
          Suma de {harvests.length} cosechas parciales.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
      <p className="text-xs text-[color:var(--muted)]">{label}</p>
      <p className="text-lg font-extrabold text-amber-900">{value}</p>
    </div>
  );
}
