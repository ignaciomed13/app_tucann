"use client";

import { useState } from "react";
import type { PlantOrigin, PlantType } from "@/lib/supabase/database.types";
import {
  canBeCutting,
  plantLabel,
  PLANT_ORIGINS,
  PLANT_TYPES,
} from "@/lib/grows/cycle";
import { planNextGrow, daysUntil, toISODate } from "@/lib/grows/planning";

// Recibe las fechas de cosecha ya planificadas como ISO (YYYY-MM-DD).
export function PerpetualPlanner({
  harvestDatesIso,
}: {
  harvestDatesIso: string[];
}) {
  const [cadence, setCadence] = useState(3);
  const [plantType, setPlantType] = useState<PlantType>("fotoperiodica");
  const [origin, setOrigin] = useState<PlantOrigin>("semilla");
  const spec = { plant_type: plantType, origin };

  const dates = harvestDatesIso.map((d) => new Date(`${d}T00:00:00Z`));
  const safeCadence = Number.isFinite(cadence) && cadence >= 1 ? cadence : 1;
  const plan = planNextGrow(dates, safeCadence, spec, new Date());

  const startIso = toISODate(plan.startDate);
  const harvestIso = toISODate(plan.harvestDate);
  const inDays = daysUntil(plan.startDate, new Date());

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">🗓️ Planificador de escalonado</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Para producción continua, calculá cuándo plantar el próximo cultivo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Cosechar cada (semanas)
          <input
            type="number"
            min={1}
            max={52}
            value={cadence}
            onChange={(e) => setCadence(Number(e.target.value))}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tipo del próximo cultivo
          <select
            value={plantType}
            onChange={(e) => {
              const next = e.target.value as PlantType;
              setPlantType(next);
              // Las autos no se clonan: el origen vuelve a semilla.
              if (!canBeCutting(next)) setOrigin("semilla");
            }}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            {PLANT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {canBeCutting(plantType) && (
          <label className="flex flex-col gap-1 text-sm">
            Origen
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value as PlantOrigin)}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              {PLANT_ORIGINS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="rounded bg-green-50 px-3 py-3 text-sm text-green-900">
        {plan.plantNow ? (
          <p>
            Plantá tu próxima <strong>{plantLabel(spec)}</strong> lo
            antes posible (idealmente ya). Con inicio hoy, cosecha estimada el{" "}
            <strong>{harvestIso}</strong>.
          </p>
        ) : (
          <p>
            Plantá tu próxima <strong>{plantLabel(spec)}</strong> el{" "}
            <strong>{startIso}</strong> (en {inDays} días) para mantener una
            cosecha cada {cadence} semanas. Cosecha estimada el{" "}
            <strong>{harvestIso}</strong>.
          </p>
        )}
      </div>
    </section>
  );
}
