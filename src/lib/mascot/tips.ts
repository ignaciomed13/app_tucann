import type { PlantType } from "@/lib/supabase/database.types";
import {
  cycleStatus,
  potAlert,
  estimatedHarvestDate,
  type Phase,
} from "@/lib/grows/cycle";
import { daysUntil } from "@/lib/grows/planning";

export interface GrowForTips {
  name: string;
  plant_type: PlantType;
  start_date: string;
  current_pot_volume_l: number;
  // ISO timestamp del último análisis IA del cultivo (null si nunca se pidió).
  lastAnalysisAt?: string | null;
}

// Días sin análisis a partir de los cuales Tucu sugiere pedir uno nuevo.
const ANALYSIS_STALE_DAYS = 7;

// Consejos de manejo por fase, en el tono de Tucu.
const PHASE_TIPS: Record<Phase, string> = {
  germinacion:
    "sustrato húmedo pero no encharcado, y paciencia: el brote avisa solo.",
  plantula:
    "luz suave y humedad alta (65–70%). Todavía no necesita fertilizante.",
  vegetativo:
    "buen momento para LST o podas suaves y armar la estructura.",
  floracion:
    "bajá la humedad (menos de 50%) y cuidá la ventilación para evitar botritis.",
  cosecha:
    "mirá los tricomas con lupa: lechosos = pico de THC, ámbar = efecto más relajado.",
  curado:
    "frascos herméticos en lugar oscuro, abrilos unos minutos por día la primera semana.",
};

const GREETINGS = [
  "Todo en orden por acá. Registrá un log cuando riegues así no perdemos el hilo. 🌱",
  "¿Mediste temperatura y humedad hoy? Un log ambiental por día hace magia en el análisis.",
  "Ojeá tus plantas de cerca cada tanto: los bichos se esconden abajo de las hojas.",
];

// Arma la lista de consejos del asistente: alertas primero, después cosechas
// próximas y consejos de fase, y al final un genérico para que nunca esté vacío.
export function buildTucuTips(grows: GrowForTips[], today: Date): string[] {
  const alerts: string[] = [];
  const harvests: string[] = [];
  const analysisNudges: string[] = [];
  const phases: string[] = [];

  for (const g of grows) {
    const status = cycleStatus(g.start_date, today, g.plant_type);
    if (!status.started || status.finished) continue;

    const alert = potAlert(status, g.current_pot_volume_l, g.plant_type);
    if (alert) {
      alerts.push(
        `⚠️ ${g.name}: maceta chica para la semana ${status.week} — tenés ${alert.currentL} L y conviene ≥${alert.minL} L.`
      );
    }

    const dLeft = daysUntil(estimatedHarvestDate(g.start_date, g.plant_type), today);
    if (dLeft > 0 && dLeft <= 14) {
      harvests.push(
        `🌾 ${g.name}: cosecha estimada en ${dLeft} día${dLeft === 1 ? "" : "s"}. Andá preparando lugar para el secado.`
      );
    }

    if (g.lastAnalysisAt === null || g.lastAnalysisAt === undefined) {
      analysisNudges.push(
        `🔍 ${g.name}: todavía no analicé este cultivo. Entrá y pedime un análisis cuando quieras.`
      );
    } else {
      const days = Math.floor(
        (today.getTime() - new Date(g.lastAnalysisAt).getTime()) / 86_400_000
      );
      if (days >= ANALYSIS_STALE_DAYS) {
        analysisNudges.push(
          `🔍 ${g.name}: hace ${days} días que no lo analizo. Pedime un análisis nuevo así vemos cómo viene.`
        );
      }
    }

    phases.push(
      `${g.name} (semana ${status.week}, ${status.phaseLabel.toLowerCase()}): ${PHASE_TIPS[status.phase]}`
    );
  }

  const greeting = GREETINGS[today.getUTCDate() % GREETINGS.length];
  return [...alerts, ...harvests, ...analysisNudges, ...phases, greeting].slice(0, 6);
}
