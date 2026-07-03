import { potAlert, type CycleStatus } from "@/lib/grows/cycle";
import type { PlantType } from "@/lib/supabase/database.types";

export function CycleBadge({ status }: { status: CycleStatus }) {
  if (!status.started) {
    return (
      <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
        No iniciado
      </span>
    );
  }

  if (status.finished) {
    return (
      <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
        Ciclo completo ({status.totalWeeks} semanas)
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      Semana {status.week}/{status.totalWeeks} · {status.phaseLabel}
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
