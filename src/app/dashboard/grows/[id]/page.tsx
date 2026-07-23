import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  cycleStatus,
  estimatedHarvestDate,
  PLANT_TYPE_LABELS,
} from "@/lib/grows/cycle";
import { daysUntil, toISODate } from "@/lib/grows/planning";
import {
  SUBSTRATE_LABELS,
  ENVIRONMENT_LABELS,
  LIGHT_TYPE_LABELS,
  VARIETY_LABELS,
} from "@/lib/grows/attributes";
import { CycleBadge, PotAlertBanner } from "@/components/grows/cycle-badge";
import { PhaseRing } from "@/components/grows/phase-ring";
import { Hero, HeroAction, HeroStat } from "@/components/ui/hero";
import { suggestedWatering } from "@/lib/logs/validation";
import { NewLogForm } from "@/components/logs/new-log-form";
import { LogList, type LogRow } from "@/components/logs/log-list";
import {
  HarvestSummary,
  type HarvestEntry,
} from "@/components/grows/harvest-summary";
import { PlantsManager } from "@/components/grows/plants-manager";
import { GrowCharts } from "@/components/grows/grow-charts";
import { hasChartableData, type ChartLog } from "@/lib/grows/charts";
import { AnalyzeButton } from "@/components/analysis/analyze-button";
import { AssignSpace } from "@/components/grows/assign-space";
import { DeleteGrowButton } from "@/components/grows/delete-grow-button";
import { ExportPdfButton } from "@/components/grows/export-pdf-button";

export default async function GrowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: grow } = await supabase
    .from("grows")
    .select("id, name, genetics, plant_type, variety, plant_count, substrate, environment, light_type, light_schedule, space_id, start_date, initial_pot_volume_l, current_pot_volume_l")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!grow) notFound();

  const [{ data: logs }, { data: spaces }, { data: plants }, { data: lastAnalysis }] =
    await Promise.all([
      supabase
        .from("logs")
        .select("id, type, log_date, data, plant_id")
        .eq("grow_id", grow.id)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("spaces")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("plants")
        .select("id, label, notes")
        .eq("grow_id", grow.id)
        .order("created_at", { ascending: true }),
      // Último análisis de Tucu, para mostrarlo al entrar sin regenerarlo.
      supabase
        .from("analyses")
        .select("content, created_at")
        .eq("grow_id", grow.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const plantList = plants ?? [];
  // Mapa id → etiqueta, para mostrar la planta en logs y cosecha.
  const plantLabels: Record<string, string> = Object.fromEntries(
    plantList.map((p) => [p.id, p.label])
  );

  // Firmar URLs de las fotos de los logs (bucket privado).
  const photoPaths = (logs ?? []).flatMap(
    (l) => (l.data as { photos?: string[] } | null)?.photos ?? []
  );
  const photoUrls: Record<string, string> = {};
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("grow-photos")
      .createSignedUrls(photoPaths, 3600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) photoUrls[s.path] = s.signedUrl;
    }
  }

  // Cosechas registradas para el resumen de rendimiento (peso seco, g/planta).
  const harvests: HarvestEntry[] = (logs ?? [])
    .filter((l) => l.type === "cosecha")
    .map((l) => ({
      log_date: l.log_date,
      data: l.data as HarvestEntry["data"],
      plant_id: l.plant_id,
    }));

  // Logs para las gráficas (mismo dataset, shape mínimo que consume charts.ts).
  const chartLogs: ChartLog[] = (logs ?? []).map((l) => ({
    type: l.type,
    log_date: l.log_date,
    data: l.data as Record<string, unknown> | null,
    plant_id: l.plant_id,
  }));

  const now = new Date();
  const status = cycleStatus(grow.start_date, now, grow.plant_type);
  const harvest = estimatedHarvestDate(grow.start_date, grow.plant_type);
  const harvestDays = daysUntil(harvest, now);

  const watering = suggestedWatering(grow.current_pot_volume_l);

  return (
    <div className="flex flex-col gap-4">
      <Hero
        back={{ href: "/dashboard", label: "← Cultivos" }}
        actions={
          <>
            <HeroAction
              href={`/dashboard/grows/${grow.id}/edit`}
              label="Editar cultivo"
            >
              ✏️
            </HeroAction>
            <ExportPdfButton growId={grow.id} variant="hero" />
          </>
        }
        leading={<PhaseRing status={status} />}
        eyebrow={
          <span className="mb-1.5 inline-block">
            <CycleBadge status={status} compact />
          </span>
        }
        title={grow.name}
        subtitle={
          <>
            {grow.plant_count > 1 ? `${grow.plant_count} plantas · ` : ""}
            {PLANT_TYPE_LABELS[grow.plant_type]} ·{" "}
            {SUBSTRATE_LABELS[grow.substrate]}
          </>
        }
        chip={
          <HeroStat
            label={`🌾 Cosecha estimada · ${toISODate(harvest)}`}
            value={
              harvestDays >= 0
                ? `en ${harvestDays} días`
                : `hace ${-harvestDays} días`
            }
          />
        }
      />

      {/* stats rápidas */}
      <div className="flex gap-2.5">
        <div className="flex-1 rounded-2xl border border-[color:var(--border)] bg-white px-3.5 py-3">
          <p className="text-[11px] font-semibold text-[color:var(--muted)]">
            💧 Riego hoy
          </p>
          <p className="mt-1 text-[19px] font-extrabold tracking-[-0.02em]">
            {watering.minL}–{watering.maxL} L
          </p>
        </div>
        <div className="flex-1 rounded-2xl border border-[color:var(--border)] bg-white px-3.5 py-3">
          <p className="text-[11px] font-semibold text-[color:var(--muted)]">
            🪴 Maceta
          </p>
          <p className="mt-1 text-[19px] font-extrabold tracking-[-0.02em]">
            {grow.current_pot_volume_l} L
          </p>
        </div>
      </div>

      <PotAlertBanner
        status={status}
        currentPotVolumeL={grow.current_pot_volume_l}
        plantType={grow.plant_type}
      />

      {/* Detalles completos: fuera del hero para no saturarlo, pero sin perder
          ningún dato del cultivo. */}
      <details className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold">
          📋 Detalles del cultivo
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-[color:var(--muted)]">
            {grow.genetics} · {PLANT_TYPE_LABELS[grow.plant_type]}
            {grow.variety ? ` · ${VARIETY_LABELS[grow.variety]}` : ""} · inicio{" "}
            {grow.start_date}
          </p>
          <p className="text-sm text-[color:var(--muted)]">
            Sustrato: {SUBSTRATE_LABELS[grow.substrate]} ·{" "}
            {ENVIRONMENT_LABELS[grow.environment]}
            {grow.light_type
              ? ` · Luz: ${LIGHT_TYPE_LABELS[grow.light_type]}`
              : ""}
            {grow.light_schedule ? ` · ${grow.light_schedule}` : ""}
          </p>
          <AssignSpace
            growId={grow.id}
            currentSpaceId={grow.space_id}
            spaces={spaces ?? []}
          />
          <div className="flex justify-end">
            <DeleteGrowButton growId={grow.id} growName={grow.name} />
          </div>
        </div>
      </details>

      <AnalyzeButton
        growId={grow.id}
        initial={
          lastAnalysis
            ? {
                content: lastAnalysis.content,
                createdAt: lastAnalysis.created_at,
              }
            : null
        }
      />

      <HarvestSummary
        harvests={harvests}
        plantCount={grow.plant_count}
        plantLabels={plantLabels}
      />

      {hasChartableData(chartLogs) && (
        <GrowCharts
          logs={chartLogs}
          plantLabels={plantLabels}
          initialPotVolumeL={grow.initial_pot_volume_l}
          startDate={grow.start_date}
        />
      )}

      <PlantsManager growId={grow.id} plants={plantList} />

      <section className="flex flex-col gap-3">
        {/* El alta de log vive en un disclosure para que el historial quede
            arriba, como en el diseño, sin perder el form inline. */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">📋 Historial</h2>
            <span className="rounded-full bg-green-700 px-3.5 py-1.5 text-xs font-extrabold text-white transition group-open:bg-[color:var(--muted)]">
              <span className="group-open:hidden">+ Log</span>
              <span className="hidden group-open:inline">Cerrar</span>
            </span>
          </summary>
          <div className="mt-3">
            <NewLogForm
              growId={grow.id}
              currentPotVolumeL={grow.current_pot_volume_l}
              substrate={grow.substrate}
              userId={user.id}
              plants={plantList}
            />
          </div>
        </details>

        <LogList
          growId={grow.id}
          logs={(logs ?? []) as LogRow[]}
          photoUrls={photoUrls}
          plantLabels={plantLabels}
        />
      </section>
    </div>
  );
}
