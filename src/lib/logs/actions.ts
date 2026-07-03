"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isValidLogType, parseLogData } from "@/lib/logs/validation";

export type LogFormState = { error?: string; success?: boolean } | undefined;

function parseCommonFields(formData: FormData) {
  const growId = String(formData.get("grow_id") ?? "");
  const rawType = String(formData.get("type") ?? "");
  const logDate = String(formData.get("log_date") ?? "");

  if (!growId) return { error: "Falta el cultivo." as const };
  if (!isValidLogType(rawType))
    return { error: "Tipo de log inválido." as const };
  if (!logDate || Number.isNaN(Date.parse(logDate)))
    return { error: "Ingresá una fecha válida." as const };

  return { growId, type: rawType, logDate };
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

  const supabase = await createClient();
  const { error } = await supabase.from("logs").insert({
    grow_id: common.growId,
    user_id: user.id,
    type: common.type,
    log_date: common.logDate,
    data: parsed.data,
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

  const supabase = await createClient();
  // El tipo no se edita: cambiar un log de tipo rompería el historial
  // (p. ej. un trasplante que deja de serlo); se borra y se crea otro.
  const { error, count } = await supabase
    .from("logs")
    .update({ log_date: common.logDate, data: parsed.data }, { count: "exact" })
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
  await supabase.from("logs").delete().eq("id", logId).eq("user_id", user.id);

  revalidatePath(`/dashboard/grows/${growId}`);
}
