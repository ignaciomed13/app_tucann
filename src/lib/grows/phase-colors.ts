import type { Phase } from "@/lib/grows/cycle";

// Color de acento por fase: verdes al inicio del ciclo, cálidos (pico de Tucu)
// al final. Se usa en el borde izquierdo y la barra de progreso de las cards.
export const PHASE_ACCENT: Record<Phase, string> = {
  germinacion: "#84cc16",
  plantula: "#65a30d",
  vegetativo: "#15803d",
  floracion: "#f5b301",
  cosecha: "#e8641b",
  curado: "#92400e",
};

export const PHASE_EMOJI: Record<Phase, string> = {
  germinacion: "🌱",
  plantula: "🌿",
  vegetativo: "🌿",
  floracion: "🌸",
  cosecha: "🌾",
  curado: "🫙",
};
