"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isValidLogType, parseLogData } from "@/lib/logs/validation";

export type LogFormState = { error?: string; success?: boolean } | undefined;

const PHOTO_BUCKET = "grow-photos";

// Paths de fotos enviados por el form; se filtran a la carpeta del propio
// usuario (defensa extra: el cliente no puede referenciar fotos ajenas).
function extractPhotos(formData: FormData, userId: string): string[] {
  return formData
    .getAll("photos")
    .map((p) => String(p))
    .filter((p) => p.startsWith(`${userId}/`))
    .slice(0, 8);
}

function parseCommonFields(formData: FormData) {
  const growId = String(formData.get("grow_id") ?? "");
  const rawType = String(formData.get("type") ?? "");
  const logDate = String(formData.get("log_date") ?? "");
  // Planta opcional: vacío = log del lote entero.
  const rawPlant = String(formData.get("plant_id") ?? "").trim();
  const plantId = rawPlant === "" ? null : rawPlant;

  if (!growId) return { error: "Falta el cultivo." as const };
  if (!isValidLogType(rawType))
    return { error: "Tipo de log inválido." as const };
  if (!logDate || Number.isNaN(Date.parse(logDate)))
    return { error: "Ingresá una fecha válida." as const };

  return { growId, type: rawType, logDate, plantId };
}

export async function createLog(
  _prevState: LogFormState,
  formData: FormData
): Promise<LogFormState> {
  const user = await requireUser();

  const common = parseCommonFields(formData);
  if ("error" in common) return { error: common.error };

  const parsed = parseLogData(common.type, formData);
  if (!parsed.ok) return { error: parsed.error };

  const photos = extractPhotos(formData, user.id);
  const data = photos.length ? { ...parsed.data, photos } : parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("logs").insert({
    grow_id: common.growId,
    user_id: user.id,
    plant_id: common.plantId,
    type: common.type,
    log_date: common.logDate,
    data,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/grows/${common.growId}`);
  return { success: true };
}

export async function updateLog(
  _prevState: LogFormState,
  formData: FormData
): Promise<LogFormState> {
  const user = await requireUser();

  const logId = String(formData.get("log_id") ?? "");
  if (!logId) return { error: "Falta el log a editar." };

  const common = parseCommonFields(formData);
  if ("error" in common) return { error: common.error };

  const parsed = parseLogData(common.type, formData);
  if (!parsed.ok) return { error: parsed.error };

  const photos = extractPhotos(formData, user.id);
  const data = photos.length ? { ...parsed.data, photos } : parsed.data;

  const supabase = await createClient();
  // El tipo no se edita: cambiar un log de tipo rompería el historial
  // (p. ej. un trasplante que deja de serlo); se borra y se crea otro.
  const { error, count } = await supabase
    .from("logs")
    .update(
      { log_date: common.logDate, plant_id: common.plantId, data },
      { count: "exact" }
    )
    .eq("id", logId)
    .eq("user_id", user.id)
    .eq("type", common.type);

  if (error) return { error: error.message };
  if (count === 0) return { error: "No se encontró el log." };

  revalidatePath(`/dashboard/grows/${common.growId}`);
  return { success: true };
}

export async function deleteLog(formData: FormData) {
  const user = await requireUser();

  const logId = String(formData.get("log_id") ?? "");
  const growId = String(formData.get("grow_id") ?? "");
  if (!logId || !growId) return;

  const supabase = await createClient();

  // Limpieza: borrar las fotos del log en Storage antes de borrar el log.
  const { data: log } = await supabase
    .from("logs")
    .select("data")
    .eq("id", logId)
    .eq("user_id", user.id)
    .maybeSingle();
  const photos = (log?.data as { photos?: string[] } | null)?.photos;
  if (photos && photos.length > 0) {
    await supabase.storage.from(PHOTO_BUCKET).remove(photos);
  }

  await supabase.from("logs").delete().eq("id", logId).eq("user_id", user.id);

  revalidatePath(`/dashboard/grows/${growId}`);
}
