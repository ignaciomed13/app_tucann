import { potAlert, type CycleStatus } from "@/lib/grows/cycle";
import type { PlantType } from "@/lib/supabase/database.types";

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
    <span className="inline-block rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
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
    <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      ⚠️ {alert.message}
    </p>
  );
}
