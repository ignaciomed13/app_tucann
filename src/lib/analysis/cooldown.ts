// Cooldown del análisis IA: un análisis cuenta como "de hoy" si se generó el
// mismo día calendario en Argentina (UTC-3, sin horario de verano). Evita
// gastar cuota de Gemini repitiendo el mismo pedido en el día.

const ART_OFFSET_MS = 3 * 60 * 60 * 1000;

// Día calendario argentino (YYYY-MM-DD) de un instante dado.
export function argDay(date: Date): string {
  return new Date(date.getTime() - ART_OFFSET_MS).toISOString().slice(0, 10);
}

export function isFromToday(createdAt: string, now: Date): boolean {
  return argDay(new Date(createdAt)) === argDay(now);
}
