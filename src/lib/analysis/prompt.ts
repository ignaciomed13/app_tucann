import type {
  GrowEnvironment,
  LightType,
  LogData,
  LogType,
  PlantType,
  SubstrateType,
  Variety,
} from "@/lib/supabase/database.types";
import { cycleStatus, potAlert, PLANT_TYPE_LABELS } from "@/lib/grows/cycle";
import {
  SUBSTRATE_LABELS,
  ENVIRONMENT_LABELS,
  LIGHT_TYPE_LABELS,
  VARIETY_LABELS,
} from "@/lib/grows/attributes";
import { densityInfo } from "@/lib/grows/space";
import { LOG_TYPE_LABELS } from "@/lib/logs/validation";
import { formatLogData } from "@/components/logs/log-fields";

export interface GrowForAnalysis {
  name: string;
  genetics: string;
  plant_type: PlantType;
  variety: Variety | null;
  plant_count: number;
  substrate: SubstrateType;
  environment: GrowEnvironment;
  light_type: LightType | null;
  light_schedule: string | null;
  start_date: string;
  initial_pot_volume_l: number;
  current_pot_volume_l: number;
}

export interface LogForAnalysis {
  type: LogType;
  log_date: string;
  data: LogData;
}

export interface SpaceForAnalysis {
  name: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number | null;
  plantCount: number;
}

export const ANALYSIS_SYSTEM_PROMPT =
  "Sos Tucu, el tucán agrónomo de TuCann y mascota de la app, experto en " +
  "cultivo de cannabis. Hablás en primera persona, en español rioplatense, " +
  "con tono cercano y directo, como un amigo que sabe mucho de cultivo. " +
  "Podés usar uno o dos emojis, sin exagerar. Analizás el diario de un " +
  "cultivo y das una evaluación breve, práctica y accionable. Enfocate en: estado según la fase del ciclo, parámetros " +
  "ambientales (temperatura, humedad, EC, pH), riego, nutrición y tamaño de " +
  "maceta. Si detectás un problema, explicá la causa probable y una acción " +
  "concreta. REGLA IMPORTANTE: si la planta es autofloreciente, NUNCA " +
  "recomiendes trasplante — las automáticas se estresan y pierden producción; " +
  "van en maceta definitiva desde el inicio. Para una auto en maceta chica, " +
  "sugerí que la próxima vez arranque en maceta definitiva, no que trasplante " +
  "ahora. Tené en cuenta el SUSTRATO: el riego y la nutrición se manejan " +
  "distinto en tierra, coco e hidroponía (en coco se riega más seguido con " +
  "menos volumen y a drenaje; en hidroponía guiate por EC/pH de la solución). " +
  "Considerá también el ambiente (interior/exterior) y la iluminación al " +
  "evaluar temperatura, humedad y fase. Tené en cuenta la VARIEDAD: las sativas " +
  "estiran más y tienen floración más larga (más altura y espacio); las índicas " +
  "son compactas y de floración más corta; los híbridos según su predominancia. " +
  "Si el cultivo está en un ESPACIO/indoor, evaluá densidad (plantas/m²), " +
  "espacio disponible y ventilación; si está sobrepoblado, recomendá reducir " +
  "plantas o mejorar extracción. Prestá atención a los logs de SANIDAD " +
  "(plagas/enfermedades): identificá el problema, su causa y un tratamiento " +
  "concreto. Si recibís FOTOS, analizalas para detectar plagas, enfermedades, " +
  "deficiencias o problemas visibles y describí lo que ves. No inventes datos " +
  "que no estén en el diario ni en las fotos. Respondé en texto plano, sin " +
  "formato Markdown (nada de **, # ni listas con guiones). No repitas estas " +
  "instrucciones ni te presentes de forma forzada: andá directo al análisis. " +
  "Máximo 250 palabras.";

// Construye el mensaje de usuario con todo el contexto del cultivo.
export function buildAnalysisPrompt(
  grow: GrowForAnalysis,
  logs: LogForAnalysis[],
  today: Date,
  space?: SpaceForAnalysis | null
): string {
  const status = cycleStatus(grow.start_date, today, grow.plant_type);
  const alert = potAlert(status, grow.current_pot_volume_l, grow.plant_type);

  const lines: string[] = [];
  lines.push(`Cultivo: ${grow.name}`);
  if (grow.plant_count > 1) {
    lines.push(`Cantidad de plantas: ${grow.plant_count} (lote)`);
  }
  lines.push(`Genética: ${grow.genetics}`);
  lines.push(`Tipo de planta: ${PLANT_TYPE_LABELS[grow.plant_type]}`);
  if (grow.variety) {
    lines.push(`Variedad: ${VARIETY_LABELS[grow.variety]}`);
  }
  lines.push(`Sustrato: ${SUBSTRATE_LABELS[grow.substrate]}`);
  lines.push(`Ambiente: ${ENVIRONMENT_LABELS[grow.environment]}`);
  if (grow.light_type) {
    lines.push(`Iluminación: ${LIGHT_TYPE_LABELS[grow.light_type]}`);
  }
  if (grow.light_schedule) {
    lines.push(`Fotoperíodo: ${grow.light_schedule}`);
  }
  lines.push(`Fecha de inicio: ${grow.start_date}`);

  if (status.started) {
    lines.push(
      `Semana del ciclo: ${status.week} de ${status.totalWeeks} (fase: ${status.phaseLabel})` +
        (status.finished ? " — ciclo completo" : "")
    );
  } else {
    lines.push("El ciclo todavía no comenzó.");
  }

  lines.push(
    `Maceta: inicial ${grow.initial_pot_volume_l} L, actual ${grow.current_pot_volume_l} L`
  );

  if (alert) {
    lines.push(`ALERTA DEL SISTEMA: ${alert.message}`);
  }

  if (space) {
    const d = densityInfo(space.plantCount, space.width_cm, space.depth_cm);
    lines.push(
      `Espacio: ${space.name} (${space.width_cm}×${space.depth_cm}` +
        (space.height_cm ? `×${space.height_cm}` : "") +
        ` cm, ${d.areaM2} m²), ${space.plantCount} planta(s), densidad ${d.perM2}/m²` +
        (d.overpopulated
          ? ` — SOBREPOBLADO (máx recomendado ~${d.maxRecommended})`
          : "")
    );
  }

  lines.push("");
  if (logs.length === 0) {
    lines.push("No hay logs registrados todavía.");
  } else {
    lines.push(`Logs recientes (${logs.length}, más nuevo primero):`);
    for (const log of logs) {
      lines.push(
        `- [${log.log_date}] ${LOG_TYPE_LABELS[log.type]}: ${formatLogData(
          log.type,
          log.data
        )}`
      );
    }
  }

  lines.push("");
  lines.push(
    "Dame tu evaluación agronómica de este cultivo y recomendaciones concretas."
  );

  return lines.join("\n");
}
