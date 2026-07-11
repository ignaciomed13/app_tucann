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

export type ReminderKind = "fase" | "riego" | "cosecha" | "sanidad" | "reprocann";

export interface Reminder {
  kind: ReminderKind;
  // Identifica el evento que motiva el aviso (fecha base, fase, etc.).
  // Mientras no cambie, el cron no vuelve a enviar el mismo recordatorio.
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
}

// Umbrales de aviso de vencimiento del REPROCANN, de más a menos urgente.
// Se envía SOLO el más urgente que aplique: si el usuario carga la fecha
// cuando ya faltan 5 días, recibe el aviso de 7, no también el de 30.
export const REPROCANN_REMINDER_DAYS = [0, 7, 30];

// Aviso de vencimiento del REPROCANN que aplica HOY (o null). Puro y testeable.
// El dedupeKey incluye fecha y umbral: cada umbral se avisa una sola vez, y al
// renovar (fecha nueva) el ciclo de avisos arranca de cero.
export function computeReprocannReminder(
  expiresOn: string,
  today: Date
): Reminder | null {
  const left = daysUntil(new Date(`${expiresOn}T00:00:00Z`), today);
  const threshold = REPROCANN_REMINDER_DAYS.find((t) => left <= t);
  if (threshold === undefined) return null;

  const base = {
    kind: "reprocann" as const,
    dedupeKey: `${expiresOn}|${threshold}`,
    url: "/dashboard/cuenta",
  };
  if (left < 0) {
    return {
      ...base,
      title: "REPROCANN vencido ⚠️",
      body: `Tu autorización venció hace ${-left} día${left === -1 ? "" : "s"}. Renovala para seguir cultivando en regla.`,
    };
  }
  if (left === 0) {
    return {
      ...base,
      title: "Tu REPROCANN vence hoy ⚠️",
      body: "Renovalo para seguir cultivando en regla.",
    };
  }
  return {
    ...base,
    title: threshold === 7 ? "Tu REPROCANN vence pronto ⏳" : "Renová tu REPROCANN 📋",
    body:
      threshold === 7
        ? `Quedan ${left} día${left === 1 ? "" : "s"}. Si todavía no iniciaste la renovación, hacelo cuanto antes.`
        : `Vence en ${left} días. Se recomienda renovar con al menos un mes de anticipación.`,
  };
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
