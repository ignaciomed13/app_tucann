import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EditLogForm } from "@/components/logs/edit-log-form";
import type { LogData } from "@/lib/supabase/database.types";

export default async function EditLogPage({
  params,
}: {
  params: Promise<{ id: string; logId: string }>;
}) {
  const { id, logId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: grow }, { data: log }] = await Promise.all([
    supabase
      .from("grows")
      .select("id, name, current_pot_volume_l, substrate")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("logs")
      .select("id, grow_id, type, log_date, data")
      .eq("id", logId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!grow || !log || log.grow_id !== grow.id) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/dashboard/grows/${grow.id}`} className="text-sm underline">
          ← {grow.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Editar log</h1>
      </div>

      <EditLogForm
        growId={grow.id}
        logId={log.id}
        type={log.type}
        logDate={log.log_date}
        data={log.data as LogData}
        currentPotVolumeL={grow.current_pot_volume_l}
        substrate={grow.substrate}
      />
    </div>
  );
}
