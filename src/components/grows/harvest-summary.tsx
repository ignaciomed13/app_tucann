import type { HarvestLogData } from "@/lib/supabase/database.types";

export interface HarvestEntry {
  log_date: string;
  data: HarvestLogData;
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
}: {
  harvests: HarvestEntry[];
  plantCount: number;
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
