import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  buildAnalysisPrompt,
  ANALYSIS_SYSTEM_PROMPT,
  type SpaceForAnalysis,
} from "@/lib/analysis/prompt";
import {
  generateAnalysis,
  GeminiError,
  type InlineImage,
} from "@/lib/analysis/gemini";
import { isFromToday } from "@/lib/analysis/cooldown";
import type { LogData } from "@/lib/supabase/database.types";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/grows/[id]/analyze">
) {
  const { id } = await ctx.params;

  // 1. Auth: solo un usuario logueado puede pedir análisis.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // force=true saltea el cooldown y regenera aunque haya un análisis de hoy.
  let force = false;
  try {
    const body = (await req.json()) as { force?: boolean } | null;
    force = body?.force === true;
  } catch {
    // sin body JSON → comportamiento por defecto (con cooldown)
  }

  const supabase = await createClient();

  // 2. Ownership: el grow debe pertenecer al usuario (RLS + filtro explícito).
  const { data: grow } = await supabase
    .from("grows")
    .select("name, genetics, plant_type, variety, plant_count, substrate, environment, light_type, light_schedule, space_id, start_date, initial_pot_volume_l, current_pot_volume_l")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!grow) {
    return NextResponse.json({ error: "Cultivo no encontrado." }, { status: 404 });
  }

  // Cooldown: si ya hay un análisis de hoy, lo devolvemos sin llamar a
  // Gemini (protege la cuota gratuita). force=true lo saltea.
  if (!force) {
    const { data: latest } = await supabase
      .from("analyses")
      .select("content, created_at")
      .eq("grow_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest && isFromToday(latest.created_at, new Date())) {
      return NextResponse.json({
        analysis: latest.content,
        createdAt: latest.created_at,
        cached: true,
      });
    }
  }

  const { data: logs } = await supabase
    .from("logs")
    .select("type, log_date, data")
    .eq("grow_id", id)
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  // Si el cultivo está en un espacio, cargamos sus dimensiones y cuántas
  // plantas lo comparten para que la IA evalúe densidad/ventilación.
  let space: SpaceForAnalysis | null = null;
  if (grow.space_id) {
    const [{ data: sp }, { data: coGrows }] = await Promise.all([
      supabase
        .from("spaces")
        .select("name, width_cm, depth_cm, height_cm")
        .eq("id", grow.space_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("grows")
        .select("plant_count")
        .eq("space_id", grow.space_id)
        .eq("user_id", user.id),
    ]);
    if (sp) {
      // Densidad real: suma de plantas de todos los cultivos del espacio.
      const plantCount = (coGrows ?? []).reduce(
        (sum, g) => sum + g.plant_count,
        0
      );
      space = {
        name: sp.name,
        width_cm: sp.width_cm,
        depth_cm: sp.depth_cm,
        height_cm: sp.height_cm,
        plantCount: plantCount || grow.plant_count,
      };
    }
  }

  // 3. Construir el prompt y llamar a la IA server-side.
  const prompt = buildAnalysisPrompt(
    grow,
    (logs ?? []).map((l) => ({
      type: l.type,
      log_date: l.log_date,
      data: l.data as LogData,
    })),
    new Date(),
    space
  );

  // Fotos recientes para diagnóstico visual (multimodal). Cap para acotar
  // payload/costo: hasta 4 fotos, de los logs más nuevos.
  const photoPaths = (logs ?? [])
    .flatMap((l) => (l.data as { photos?: string[] } | null)?.photos ?? [])
    .slice(0, 4);
  const images: InlineImage[] = [];
  for (const path of photoPaths) {
    const { data: blob } = await supabase.storage
      .from("grow-photos")
      .download(path);
    if (blob) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      images.push({
        mimeType: blob.type || "image/jpeg",
        dataBase64: base64,
      });
    }
  }

  try {
    const analysis = await generateAnalysis(
      ANALYSIS_SYSTEM_PROMPT,
      prompt,
      images
    );
    // Guardamos el análisis en el historial. Si el insert falla (ej. la
    // migración de `analyses` todavía no corrió), igual devolvemos el texto.
    const { data: saved } = await supabase
      .from("analyses")
      .insert({ grow_id: id, content: analysis })
      .select("created_at")
      .maybeSingle();
    return NextResponse.json({
      analysis,
      createdAt: saved?.created_at ?? new Date().toISOString(),
    });
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
