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
} from "@/lib/grows/attributes";
import { CycleBadge, PotAlertBanner } from "@/components/grows/cycle-badge";
import { NewLogForm } from "@/components/logs/new-log-form";
import { LogList, type LogRow } from "@/components/logs/log-list";
import { AnalyzeButton } from "@/components/analysis/analyze-button";

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
    .select("id, name, genetics, plant_type, substrate, environment, light_type, light_schedule, start_date, initial_pot_volume_l, current_pot_volume_l")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!grow) notFound();

  const { data: logs } = await supabase
    .from("logs")
    .select("id, type, log_date, data")
    .eq("grow_id", grow.id)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });

  const now = new Date();
  const status = cycleStatus(grow.start_date, now, grow.plant_type);
  const harvest = estimatedHarvestDate(grow.start_date, grow.plant_type);
  const harvestDays = daysUntil(harvest, now);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{grow.name}</h1>
          <CycleBadge status={status} />
        </div>
        <p className="text-sm text-neutral-600">
          {grow.genetics} · {PLANT_TYPE_LABELS[grow.plant_type]} · inicio{" "}
          {grow.start_date} · maceta actual {grow.current_pot_volume_l} L
        </p>
        <p className="text-sm text-neutral-600">
          Sustrato: {SUBSTRATE_LABELS[grow.substrate]} ·{" "}
          {ENVIRONMENT_LABELS[grow.environment]}
          {grow.light_type ? ` · Luz: ${LIGHT_TYPE_LABELS[grow.light_type]}` : ""}
          {grow.light_schedule ? ` · ${grow.light_schedule}` : ""}
        </p>
        <p className="text-sm text-neutral-600">
          Cosecha estimada: {toISODate(harvest)}{" "}
          {harvestDays >= 0 ? `(en ${harvestDays} días)` : `(hace ${-harvestDays} días)`}
        </p>
        <PotAlertBanner
          status={status}
          currentPotVolumeL={grow.current_pot_volume_l}
          plantType={grow.plant_type}
        />
      </div>

      <AnalyzeButton growId={grow.id} />

      <NewLogForm
        growId={grow.id}
        currentPotVolumeL={grow.current_pot_volume_l}
        substrate={grow.substrate}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Historial</h2>
        <LogList growId={grow.id} logs={(logs ?? []) as LogRow[]} />
      </section>
    </div>
  );
}
