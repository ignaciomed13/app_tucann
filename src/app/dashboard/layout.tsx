import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { buildTucuTips } from "@/lib/mascot/tips";
import { TucuAssistant } from "@/components/mascot/tucu-assistant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: grows }, { data: analyses }] = await Promise.all([
    supabase
      .from("grows")
      .select("id, name, plant_type, start_date, current_pot_volume_l")
      .eq("user_id", user.id),
    // Análisis recientes para que Tucu sepa cuándo analizó cada cultivo.
    supabase
      .from("analyses")
      .select("grow_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  // Fecha del último análisis por cultivo (la query viene ordenada).
  const lastAnalysisByGrow = new Map<string, string>();
  for (const a of analyses ?? []) {
    if (!lastAnalysisByGrow.has(a.grow_id)) {
      lastAnalysisByGrow.set(a.grow_id, a.created_at);
    }
  }
  const tips = buildTucuTips(
    (grows ?? []).map((g) => ({
      ...g,
      lastAnalysisAt: lastAnalysisByGrow.get(g.id) ?? null,
    })),
    new Date()
  );

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-green-700 to-green-500 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/tucu-face.png"
              alt="Tucu"
              width={345}
              height={224}
              className="h-9 w-auto"
            />
            <span className="text-lg font-extrabold tracking-tight">TuCann</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden opacity-90 sm:inline">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-white/15 px-3 py-1.5 font-medium text-white ring-1 ring-white/30 transition hover:bg-white/25"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 pb-44">{children}</main>
      <TucuAssistant tips={tips} />
    </div>
  );
}
