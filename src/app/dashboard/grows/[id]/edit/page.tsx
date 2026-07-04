import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { updateGrow } from "@/lib/grows/actions";
import { GrowForm } from "@/components/grows/grow-form";

export default async function EditGrowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: grow }, { data: spaces }] = await Promise.all([
    supabase
      .from("grows")
      .select("id, name, genetics, plant_type, variety, plant_count, substrate, environment, light_type, light_schedule, space_id, start_date")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("spaces")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!grow) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/grows/${grow.id}`}
          className="text-sm font-medium text-green-700 hover:underline"
        >
          ← {grow.name}
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Editar cultivo
        </h1>
      </div>
      <GrowForm
        action={updateGrow}
        spaces={spaces ?? []}
        defaults={grow}
        submitLabel="Guardar cambios"
        isEdit
      />
    </div>
  );
}
