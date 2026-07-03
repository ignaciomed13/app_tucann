import { describe, expect, it } from "vitest";
import { areaM2, capacityGuide, densityInfo } from "@/lib/grows/space";

describe("areaM2", () => {
  it("convierte cm a m² (100×100 = 1 m²)", () => {
    expect(areaM2(100, 100)).toBe(1);
    expect(areaM2(120, 120)).toBe(1.44);
    expect(areaM2(60, 60)).toBe(0.36);
  });
});

describe("capacityGuide", () => {
  it("da más plantas en SOG que en SCROG", () => {
    const g = capacityGuide(1); // 1 m²
    expect(g.scrog).toBe(1);
    expect(g.estandar).toBe(4);
    expect(g.sog).toBe(9);
  });

  it("escala con el área y nunca baja de 1", () => {
    expect(capacityGuide(2).estandar).toBe(8);
    expect(capacityGuide(0.25).scrog).toBe(1); // mínimo 1
  });
});

describe("densityInfo", () => {
  it("calcula densidad y no marca sobrepoblación dentro del límite", () => {
    const d = densityInfo(4, 100, 100); // 4 en 1 m²
    expect(d.areaM2).toBe(1);
    expect(d.perM2).toBe(4);
    expect(d.maxRecommended).toBe(9);
    expect(d.overpopulated).toBe(false);
  });

  it("marca sobrepoblación al pasar el máximo", () => {
    const d = densityInfo(12, 100, 100); // 12 en 1 m²
    expect(d.overpopulated).toBe(true);
  });

  it("un espacio grande admite más plantas antes de alertar", () => {
    const d = densityInfo(10, 120, 120); // 1.44 m² → máx ~13
    expect(d.overpopulated).toBe(false);
  });
});
