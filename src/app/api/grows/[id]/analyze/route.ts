import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from "@/lib/analysis/prompt";
import { generateAnalysis, GeminiError } from "@/lib/analysis/gemini";
import type { LogData } from "@/lib/supabase/database.types";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/grows/[id]/analyze">
) {
  const { id } = await ctx.params;

  // 1. Auth: solo un usuario logueado puede pedir análisis.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const supabase = await createClient();

  // 2. Ownership: el grow debe pertenecer al usuario (RLS + filtro explícito).
  const { data: grow } = await supabase
    .from("grows")
    .select("name, genetics, plant_type, substrate, environment, light_type, light_schedule, start_date, initial_pot_volume_l, current_pot_volume_l")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!grow) {
    return NextResponse.json({ error: "Cultivo no encontrado." }, { status: 404 });
  }

  const { data: logs } = await supabase
    .from("logs")
    .select("type, log_date, data")
    .eq("grow_id", id)
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  // 3. Construir el prompt y llamar a la IA server-side.
  const prompt = buildAnalysisPrompt(
    grow,
    (logs ?? []).map((l) => ({
      type: l.type,
      log_date: l.log_date,
      data: l.data as LogData,
    })),
    new Date()
  );

  try {
    const analysis = await generateAnalysis(ANALYSIS_SYSTEM_PROMPT, prompt);
    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Error inesperado al generar el análisis." },
      { status: 500 }
    );
  }
}
