// Densidad recomendada por técnica, en plantas por m². Valores de referencia
// (agronómicamente opinables), fáciles de ajustar en un solo lugar:
//   - SCROG: pocas plantas grandes, muy entrenadas.
//   - Estándar: densidad media.
//   - SOG (sea of green): muchas plantas chicas.
export const PLANTS_PER_M2 = {
  scrog: 1,
  estandar: 4,
  sog: 9,
} as const;

// Por encima de esta densidad se considera sobrepoblado (más denso que un SOG).
const MAX_PLANTS_PER_M2 = PLANTS_PER_M2.sog;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function areaM2(widthCm: number, depthCm: number): number {
  return round2((widthCm / 100) * (depthCm / 100));
}

export interface CapacityGuide {
  scrog: number;
  estandar: number;
  sog: number;
}

// Cuántas plantas "entran" según técnica, para un área dada.
export function capacityGuide(area: number): CapacityGuide {
  const r = (perM2: number) => Math.max(1, Math.round(area * perM2));
  return {
    scrog: r(PLANTS_PER_M2.scrog),
    estandar: r(PLANTS_PER_M2.estandar),
    sog: r(PLANTS_PER_M2.sog),
  };
}

export interface DensityInfo {
  areaM2: number;
  plantCount: number;
  perM2: number; // densidad actual
  maxRecommended: number;
  overpopulated: boolean;
}

export function densityInfo(
  plantCount: number,
  widthCm: number,
  depthCm: number
): DensityInfo {
  const area = areaM2(widthCm, depthCm);
  const perM2 = area > 0 ? Math.round((plantCount / area) * 10) / 10 : 0;
  const maxRecommended = Math.max(1, Math.round(area * MAX_PLANTS_PER_M2));
  return {
    areaM2: area,
    plantCount,
    perM2,
    maxRecommended,
    overpopulated: plantCount > maxRecommended,
  };
}
