import type { PlantType } from "@/lib/supabase/database.types";
import { cycleStatus, estimatedHarvestDate } from "@/lib/grows/cycle";
import { daysUntil } from "@/lib/grows/planning";

// Umbrales (agronómicamente opinables, fáciles de ajustar). Cada recordatorio
// lleva un dedupeKey que el cron persiste en sent_reminders: el riego usa
// ">= N días" sin riesgo de spam (se envía una vez por sequía) y los demás
// quedan protegidos contra corridas duplicadas del cron.
export const WATERING_REMINDER_DAYS = 4; // días sin riego
export const HARVEST_REMINDER_DAYS = [7, 1]; // días antes de cosecha
export const SANIDAD_FOLLOWUP_DAYS = 3; // días tras registrar un problema

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysSince(iso: string, today: Date): number {
  const from = new Date(`${iso}T00:00:00Z`);
  return Math.round((utcMidnight(today).getTime() - from.getTime()) / MS_PER_DAY);
}

export interface GrowReminderInput {
  name: string;
  plant_type: PlantType;
  start_date: string;
  lastWateringDate: string | null;
  lastSanidadDate: string | null;
  lastSanidadIssueLabel: string | null;
}

export type ReminderKind = "fase" | "riego" | "cosecha" | "sanidad";

export interface Reminder {
  kind: ReminderKind;
  // Identifica el evento que motiva el aviso (fecha base, fase, etc.).
  // Mientras no cambie, el cron no vuelve a enviar el mismo recordatorio.
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
}

// Devuelve los recordatorios que aplican HOY para un cultivo. Puro y testeable.
export function computeReminders(
  g: GrowReminderInput,
  today: Date,
  growUrl: string
): Reminder[] {
  const reminders: Reminder[] = [];

  const status = cycleStatus(g.start_date, today, g.plant_type);
  if (!status.started || status.finished) return reminders;

  const activeGrowth =
    status.phase !== "cosecha" && status.phase !== "curado";

  // 1. Cambio de fase (comparando con ayer).
  const yesterday = new Date(utcMidnight(today).getTime() - MS_PER_DAY);
  const statusYest = cycleStatus(g.start_date, yesterday, g.plant_type);
  if (
    statusYest.started &&
    !statusYest.finished &&
    statusYest.phase !== status.phase
  ) {
    reminders.push({
      kind: "fase",
      dedupeKey: status.phase,
      title: "Cambio de fase 🌿",
      body: `${g.name} pasó a ${status.phaseLabel} (semana ${status.week}).`,
      url: growUrl,
    });
  }

  // 2. Riego: X o más días sin registrar riego (desde el último riego o el
  // inicio). El dedupeKey es la fecha base: se avisa una sola vez por sequía,
  // aunque el log se cargue retro-fechado o el cron se saltee el día exacto.
  if (activeGrowth) {
    const base = g.lastWateringDate ?? g.start_date;
    const dry = daysSince(base, today);
    if (dry >= WATERING_REMINDER_DAYS) {
      reminders.push({
        kind: "riego",
        dedupeKey: base,
        title: "Riego 💧",
        body: `Hace ${dry} días que no registrás riego en ${g.name}.`,
        url: growUrl,
      });
    }
  }

  // 3. Cosecha próxima.
  const dLeft = daysUntil(estimatedHarvestDate(g.start_date, g.plant_type), today);
  if (HARVEST_REMINDER_DAYS.includes(dLeft)) {
    reminders.push({
      kind: "cosecha",
      dedupeKey: String(dLeft),
      title: "Cosecha próxima 🌾",
      body: `${g.name} entra en cosecha en ${dLeft} día${dLeft === 1 ? "" : "s"}.`,
      url: growUrl,
    });
  }

  // 4. Seguimiento de sanidad.
  if (g.lastSanidadDate && daysSince(g.lastSanidadDate, today) === SANIDAD_FOLLOWUP_DAYS) {
    const issue = g.lastSanidadIssueLabel ? ` (${g.lastSanidadIssueLabel})` : "";
    reminders.push({
      kind: "sanidad",
      dedupeKey: g.lastSanidadDate,
      title: "Seguimiento de sanidad 🔎",
      body: `Revisá ${g.name}${issue}: registraste un problema hace ${SANIDAD_FOLLOWUP_DAYS} días.`,
      url: growUrl,
    });
  }

  return reminders;
}
