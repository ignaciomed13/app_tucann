import { potAlert, type CycleStatus, type Phase } from "@/lib/grows/cycle";
import type { PlantType } from "@/lib/supabase/database.types";

// Color por fase: verdes al inicio del ciclo, cálidos (pico de Tucu) al final.
const PHASE_STYLES: Record<Phase, string> = {
  germinacion: "bg-lime-100 text-lime-900 ring-1 ring-lime-300",
  plantula: "bg-lime-200 text-lime-950 ring-1 ring-lime-400",
  vegetativo: "bg-green-600 text-white shadow-sm",
  floracion: "bg-[color:var(--sun)] text-[color:var(--ink)] shadow-sm",
  cosecha: "bg-[color:var(--clay)] text-white shadow-sm",
  curado: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
};

export function CycleBadge({ status }: { status: CycleStatus }) {
  if (!status.started) {
    return (
      <span className="inline-block rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-bold text-neutral-700">
        No iniciado
      </span>
    );
  }

  if (status.finished) {
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300">
        🏁 Ciclo completo ({status.totalWeeks} sem)
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${PHASE_STYLES[status.phase]}`}
    >
      Sem {status.week}/{status.totalWeeks} · {status.phaseLabel}
    </span>
  );
}

export function PotAlertBanner({
  status,
  currentPotVolumeL,
  plantType,
}: {
  status: CycleStatus;
  currentPotVolumeL: number;
  plantType: PlantType;
}) {
  const alert = potAlert(status, currentPotVolumeL, plantType);
  if (!alert) return null;

  return (
    <p className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900">
      ⚠️ {alert.message}
    </p>
  );
}
