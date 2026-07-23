import type { CycleStatus } from "@/lib/grows/cycle";

/**
 * Anillo de progreso del ciclo para el hero de la ficha de cultivo: el tramo
 * completado en lima sobre el verde del hero, con "S{semana} / de {total}"
 * en el centro.
 */
export function PhaseRing({ status }: { status: CycleStatus }) {
  const pct = status.started
    ? Math.min(100, Math.round((status.week / status.totalWeeks) * 100))
    : 0;

  return (
    <div
      className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--accent) ${pct}%, rgba(255,255,255,.18) 0)`,
      }}
      role="img"
      aria-label={
        status.started
          ? `Semana ${status.week} de ${status.totalWeeks}`
          : "Cultivo no iniciado"
      }
    >
      <div className="flex h-[82px] w-[82px] flex-col items-center justify-center rounded-full bg-[color:var(--brand-strong)]">
        {status.started ? (
          <>
            <span className="text-2xl font-black leading-none">
              S{status.week}
            </span>
            <span className="mt-0.5 text-[10px] text-green-200">
              de {status.totalWeeks}
            </span>
          </>
        ) : (
          <span className="px-2 text-center text-[11px] font-bold leading-tight text-green-200">
            Sin iniciar
          </span>
        )}
      </div>
    </div>
  );
}
