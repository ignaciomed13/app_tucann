import type { PlantType } from "@/lib/supabase/database.types";
import {
  estimatedHarvestDate,
  harvestWeek,
} from "@/lib/grows/cycle";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function utcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Días desde `today` hasta `date` (negativo si ya pasó).
export function daysUntil(date: Date, today: Date): number {
  return Math.round(
    (utcMidnight(date).getTime() - utcMidnight(today).getTime()) / MS_PER_DAY
  );
}

export interface GrowForSchedule {
  id: string;
  name: string;
  plant_type: PlantType;
  start_date: string;
}

export interface ScheduleItem {
  id: string;
  name: string;
  plantType: PlantType;
  startDate: string;
  harvestDate: Date;
}

// Cultivos ordenados por fecha estimada de cosecha (la más próxima primero).
export function buildSchedule(grows: GrowForSchedule[]): ScheduleItem[] {
  return grows
    .map((g) => ({
      id: g.id,
      name: g.name,
      plantType: g.plant_type,
      startDate: g.start_date,
      harvestDate: estimatedHarvestDate(g.start_date, g.plant_type),
    }))
    .sort((a, b) => a.harvestDate.getTime() - b.harvestDate.getTime());
}

export interface NextGrowPlan {
  plantNow: boolean;
  startDate: Date;
  harvestDate: Date;
}

// Para mantener una cosecha cada `cadenceWeeks`, calcula cuándo plantar el
// próximo cultivo: apunta a cosechar una cadencia después de la última cosecha
// ya planificada. Si esa fecha de plantado ya pasó, hay que plantar hoy.
export function planNextGrow(
  harvestDates: Date[],
  cadenceWeeks: number,
  plantType: PlantType,
  today: Date
): NextGrowPlan {
  const todayUtc = utcMidnight(today);
  const harvestOffsetMs = (harvestWeek(plantType) - 1) * 7 * MS_PER_DAY;

  const harvestFromStart = (start: Date) =>
    new Date(start.getTime() + harvestOffsetMs);

  if (harvestDates.length === 0) {
    return {
      plantNow: true,
      startDate: todayUtc,
      harvestDate: harvestFromStart(todayUtc),
    };
  }

  const lastHarvest = harvestDates.reduce((a, b) =>
    b.getTime() > a.getTime() ? b : a
  );
  const targetHarvest = new Date(
    lastHarvest.getTime() + cadenceWeeks * 7 * MS_PER_DAY
  );
  const startDate = new Date(targetHarvest.getTime() - harvestOffsetMs);

  if (startDate.getTime() <= todayUtc.getTime()) {
    return {
      plantNow: true,
      startDate: todayUtc,
      harvestDate: harvestFromStart(todayUtc),
    };
  }

  return { plantNow: false, startDate, harvestDate: targetHarvest };
}
