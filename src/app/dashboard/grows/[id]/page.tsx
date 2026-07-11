import Link from "next/link";
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-green-700 hover:underline">
          ← Tus cultivos
        </Link>
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] border-t-4 border-t-green-600 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight">{grow.name}</h1>
            <CycleBadge status={status} />
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/dashboard/grows/${grow.id}/edit`}
                className="rounded-full border border-green-700 px-3 py-1 text-xs font-bold text-green-800 transition hover:bg-green-50"
              >
                Editar
              </Link>
              <DeleteGrowButton growId={grow.id} growName={grow.name} />
            </div>
          </div>
          <p className="text-sm text-[color:var(--muted)]">
            {grow.plant_count > 1 ? `${grow.plant_count} plantas · ` : ""}
            {grow.genetics} · {PLANT_TYPE_LABELS[grow.plant_type]}
            {grow.variety ? ` · ${VARIETY_LABELS[grow.variety]}` : ""} · inicio{" "}
            {grow.start_date} · maceta actual {grow.current_pot_volume_l} L
          </p>
          <p className="text-sm text-[color:var(--muted)]">
            Sustrato: {SUBSTRATE_LABELS[grow.substrate]} ·{" "}
            {ENVIRONMENT_LABELS[grow.environment]}
            {grow.light_type ? ` · Luz: ${LIGHT_TYPE_LABELS[grow.light_type]}` : ""}
            {grow.light_schedule ? ` · ${grow.light_schedule}` : ""}
          </p>
          <p className="text-sm font-medium text-green-800">
            🌾 Cosecha estimada: {toISODate(harvest)}{" "}
            {harvestDays >= 0 ? `(en ${harvestDays} días)` : `(hace ${-harvestDays} días)`}
          </p>
          <PotAlertBanner
            status={status}
            currentPotVolumeL={grow.current_pot_volume_l}
            plantType={grow.plant_type}
          />
          <AssignSpace
            growId={grow.id}
            currentSpaceId={grow.space_id}
            spaces={spaces ?? []}
          />
        </div>
      </div>

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

      <NewLogForm
        growId={grow.id}
        currentPotVolumeL={grow.current_pot_volume_l}
        substrate={grow.substrate}
        userId={user.id}
        plants={plantList}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">📋 Historial</h2>
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
