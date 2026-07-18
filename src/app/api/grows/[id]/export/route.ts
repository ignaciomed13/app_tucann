import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  buildGrowExportData,
  growExportFilename,
  type LogForExport,
  type SpaceForExport,
} from "@/lib/grows/export";
import { renderGrowPdf, type PhotoBytes } from "@/lib/grows/export-pdf";
import type { LogData } from "@/lib/supabase/database.types";

// react-pdf necesita Node (no Edge); las fotos pueden tardar en bajar.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/grows/[id]/export">
) {
  const { id } = await ctx.params;

  // 1. Auth: solo un usuario logueado puede exportar.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const supabase = await createClient();

  // 2. Ownership: el grow debe pertenecer al usuario (RLS + filtro explícito).
  const { data: grow } = await supabase
    .from("grows")
    .select(
      "name, genetics, plant_type, variety, plant_count, substrate, environment, light_type, light_schedule, space_id, start_date, initial_pot_volume_l, current_pot_volume_l"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!grow) {
    return NextResponse.json(
      { error: "Cultivo no encontrado." },
      { status: 404 }
    );
  }

  // 3. Datos: bitácora completa (sin límite: es un registro integral),
  //    plantas, espacio y vencimiento REPROCANN.
  const [{ data: logs }, { data: plants }, { data: settings }] =
    await Promise.all([
      supabase
        .from("logs")
        .select("type, log_date, data, plant_id")
        .eq("grow_id", id)
        .eq("user_id", user.id)
        .order("log_date", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("plants")
        .select("id, label, notes")
        .eq("grow_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_settings")
        .select("reprocann_expires_on")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  let space: SpaceForExport | null = null;
  if (grow.space_id) {
    const { data: sp } = await supabase
      .from("spaces")
      .select("name, width_cm, depth_cm, height_cm")
      .eq("id", grow.space_id)
      .eq("user_id", user.id)
      .maybeSingle();
    space = sp ?? null;
  }

  const now = new Date();
  const data = buildGrowExportData({
    grow,
    logs: ((logs ?? []) as LogForExport[]).map((l) => ({
      type: l.type,
      log_date: l.log_date,
      data: l.data as LogData,
      plant_id: l.plant_id,
    })),
    plants: plants ?? [],
    space,
    email: user.email ?? "",
    reprocannExpiresOn: settings?.reprocann_expires_on ?? null,
    now,
  });

  // 4. Fotos seleccionadas (ya capeadas por buildGrowExportData): bajarlas
  //    del bucket privado y embeberlas como data URLs.
  const photos: PhotoBytes[] = [];
  for (const p of data.photos) {
    const { data: blob } = await supabase.storage
      .from("grow-photos")
      .download(p.path);
    if (blob) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      photos.push({
        path: p.path,
        dataUrl: `data:${blob.type || "image/jpeg"};base64,${base64}`,
      });
    }
  }

  try {
    const pdf = await renderGrowPdf(data, photos);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${growExportFilename(grow.name, now)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error inesperado al generar el PDF." },
      { status: 500 }
    );
  }
}
