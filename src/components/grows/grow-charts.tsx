"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ChartLog } from "@/lib/grows/charts";

// recharts es pesado: lo cargamos en un chunk aparte, sólo en el cliente y sólo
// cuando el usuario abre la sección. Hasta entonces el bundle inicial no lo trae.
const GrowChartsContent = dynamic(() => import("./grow-charts-content"), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-[color:var(--muted)]">
      Cargando gráficas…
    </p>
  ),
});

/**
 * Sección "📊 Gráficas" plegable en la ficha del cultivo. Va cerrada por
 * defecto (las gráficas son opcionales de ver y no deben ocupar espacio si no
 * las pedís). Mismo patrón que PlantsManager.
 */
export function GrowCharts({
  logs,
  plantLabels,
  initialPotVolumeL,
  startDate,
}: {
  logs: ChartLog[];
  plantLabels: Record<string, string>;
  initialPotVolumeL: number;
  startDate: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <h2 className="flex items-center gap-2 text-lg font-bold">📊 Gráficas</h2>
        <span className="text-sm text-[color:var(--muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[color:var(--muted)]">
            Tendencias de ambiente, riego, maceta y cosecha derivadas de tus logs.
          </p>
          <GrowChartsContent
            logs={logs}
            plantLabels={plantLabels}
            initialPotVolumeL={initialPotVolumeL}
            startDate={startDate}
          />
        </div>
      )}
    </section>
  );
}
