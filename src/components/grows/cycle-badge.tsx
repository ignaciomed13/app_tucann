import {
  potAlert,
  type CycleSpec,
  type CycleStatus,
  type Phase,
} from "@/lib/grows/cycle";
import { PHASE_EMOJI } from "@/lib/grows/phase-colors";

// Color por fase: verdes al inicio del ciclo, cálidos (pico de Tucu) al final.
const PHASE_STYLES: Record<Phase, string> = {
  enraizamiento: "bg-teal-100 text-teal-900 ring-1 ring-teal-300",
  germinacion: "bg-lime-100 text-lime-900 ring-1 ring-lime-300",
  plantula: "bg-lime-200 text-lime-950 ring-1 ring-lime-400",
  vegetativo: "bg-green-700 text-white shadow-sm",
  floracion: "bg-[color:var(--sun)] text-[color:var(--ink)] shadow-sm",
  cosecha: "bg-[color:var(--clay)] text-white shadow-sm",
  curado: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
};

// Etiquetas cortas para las cards de lista, donde el ancho es escaso.
const PHASE_SHORT: Record<Phase, string> = {
  enraizamiento: "Raíz",
  germinacion: "Germ.",
  plantula: "Plánt.",
  vegetativo: "Veget.",
  floracion: "Flor.",
  cosecha: "Cosecha",
  curado: "Curado",
};

const BADGE_BASE =
  "inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold";

/**
 * Badge de fase. `compact` (usado en las cards de lista) muestra solo emoji +
 * fase abreviada; el modo normal agrega la semana.
 */
export function CycleBadge({
  status,
  compact = false,
}: {
  status: CycleStatus;
  compact?: boolean;
}) {
  if (!status.started) {
    return (
      <span className={`${BADGE_BASE} bg-neutral-200 text-neutral-700`}>
        No iniciado
      </span>
    );
  }

  if (status.finished) {
    return (
      <span
        className={`${BADGE_BASE} border border-amber-400 bg-amber-100 text-amber-800`}
      >
        🏁 {compact ? "Completo" : `Ciclo completo (${status.totalWeeks} sem)`}
      </span>
    );
  }

  return (
    <span className={`${BADGE_BASE} ${PHASE_STYLES[status.phase]}`}>
      {compact
        ? `${PHASE_EMOJI[status.phase]} ${PHASE_SHORT[status.phase]}`
        : `Sem ${status.week}/${status.totalWeeks} · ${status.phaseLabel}`}
    </span>
  );
}

export function PotAlertBanner({
  status,
  currentPotVolumeL,
  spec,
}: {
  status: CycleStatus;
  currentPotVolumeL: number;
  spec: CycleSpec;
}) {
  const alert = potAlert(status, currentPotVolumeL, spec);
  if (!alert) return null;

  return (
    <p className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900">
      ⚠️ {alert.message}
    </p>
  );
}
