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
      {/* Mismo verde que el Hero de cada pantalla: juntos se leen como una
          sola pieza continua. */}
      <header className="bg-[color:var(--brand-strong)] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 pb-1 pt-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/tucu-face.png"
              alt="Tucu"
              width={345}
              height={224}
              className="h-[30px] w-auto"
            />
            <span className="text-[17px] font-extrabold tracking-[-0.02em]">
              TuCann
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard/cuenta"
              aria-label="Tu cuenta"
              title="Tu cuenta"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
            >
              👤
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-5 pb-44">{children}</main>
      <TucuAssistant tips={tips} />
    </div>
  );
}
