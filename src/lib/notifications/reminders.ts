import type { PlantType } from "@/lib/supabase/database.types";
import { cycleStatus, estimatedHarvestDate } from "@/lib/grows/cycle";
import { daysUntil } from "@/lib/grows/planning";

// Umbrales (agronómicamente opinables, fáciles de ajustar). Se usan gatillos
// de "día exacto" para que un cron diario no mande spam todos los días.
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

export interface Reminder {
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
      title: "Cambio de fase 🌿",
      body: `${g.name} pasó a ${status.phaseLabel} (semana ${status.week}).`,
      url: growUrl,
    });
  }

  // 2. Riego: X días sin registrar riego (desde el último riego o el inicio).
  if (activeGrowth) {
    const base = g.lastWateringDate ?? g.start_date;
    if (daysSince(base, today) === WATERING_REMINDER_DAYS) {
      reminders.push({
        title: "Riego 💧",
        body: `Hace ${WATERING_REMINDER_DAYS} días que no registrás riego en ${g.name}.`,
        url: growUrl,
      });
    }
  }

  // 3. Cosecha próxima.
  const dLeft = daysUntil(estimatedHarvestDate(g.start_date, g.plant_type), today);
  if (HARVEST_REMINDER_DAYS.includes(dLeft)) {
    reminders.push({
      title: "Cosecha próxima 🌾",
      body: `${g.name} entra en cosecha en ${dLeft} día${dLeft === 1 ? "" : "s"}.`,
      url: growUrl,
    });
  }

  // 4. Seguimiento de sanidad.
  if (g.lastSanidadDate && daysSince(g.lastSanidadDate, today) === SANIDAD_FOLLOWUP_DAYS) {
    const issue = g.lastSanidadIssueLabel ? ` (${g.lastSanidadIssueLabel})` : "";
    reminders.push({
      title: "Seguimiento de sanidad 🔎",
      body: `Revisá ${g.name}${issue}: registraste un problema hace ${SANIDAD_FOLLOWUP_DAYS} días.`,
      url: growUrl,
    });
  }

  return reminders;
}
