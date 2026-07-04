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
    .select("name, genetics, plant_type, variety, substrate, environment, light_type, light_schedule, space_id, start_date, initial_pot_volume_l, current_pot_volume_l")
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

  // Si el cultivo está en un espacio, cargamos sus dimensiones y cuántas
  // plantas lo comparten para que la IA evalúe densidad/ventilación.
  let space: SpaceForAnalysis | null = null;
  if (grow.space_id) {
    const [{ data: sp }, { count }] = await Promise.all([
      supabase
        .from("spaces")
        .select("name, width_cm, depth_cm, height_cm")
        .eq("id", grow.space_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("grows")
        .select("id", { count: "exact", head: true })
        .eq("space_id", grow.space_id)
        .eq("user_id", user.id),
    ]);
    if (sp) {
      space = {
        name: sp.name,
        width_cm: sp.width_cm,
        depth_cm: sp.depth_cm,
        height_cm: sp.height_cm,
        plantCount: count ?? 1,
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
