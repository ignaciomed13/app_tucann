import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createGrow } from "@/lib/grows/actions";
import { GrowForm } from "@/components/grows/grow-form";
import { Hero } from "@/components/ui/hero";

export default async function NewGrowPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <Hero
        back={{ href: "/dashboard", label: "← Cultivos" }}
        title="Nuevo cultivo"
      />
      <GrowForm
        action={createGrow}
        spaces={spaces ?? []}
        submitLabel="Crear cultivo"
      />
    </div>
  );
}
