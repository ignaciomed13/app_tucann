import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { updateGrow } from "@/lib/grows/actions";
import { GrowForm } from "@/components/grows/grow-form";
import { Hero } from "@/components/ui/hero";

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
    <div className="flex flex-col gap-4">
      <Hero
        back={{ href: `/dashboard/grows/${grow.id}`, label: `← ${grow.name}` }}
        title="Editar cultivo"
      />
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
