import type { LogType } from "@/lib/supabase/database.types";

// Emoji e hilo de color de cada tipo de log, para las cards con acento a la
// izquierda del historial.
export const LOG_APPEARANCE: Record<LogType, { emoji: string; accent: string }> =
  {
    watering: { emoji: "💧", accent: "#38bdf8" },
    environmental: { emoji: "🌡️", accent: "#64748b" },
    nutrition: { emoji: "🧪", accent: "#84cc16" },
    observation: { emoji: "📝", accent: "#15803d" },
    transplant: { emoji: "🪴", accent: "#a16207" },
    training: { emoji: "✂️", accent: "#0ea5e9" },
    sanidad: { emoji: "🐛", accent: "#e8641b" },
    cosecha: { emoji: "🌾", accent: "#f5b301" },
  };
