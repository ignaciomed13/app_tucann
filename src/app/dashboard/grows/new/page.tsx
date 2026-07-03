import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { NewGrowForm } from "@/components/grows/new-grow-form";

export default async function NewGrowPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Nuevo cultivo</h1>
      <NewGrowForm spaces={spaces ?? []} />
    </div>
  );
}
