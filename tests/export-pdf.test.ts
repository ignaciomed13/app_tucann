import { describe, expect, it } from "vitest";
import { buildGrowExportData } from "@/lib/grows/export";
import { renderGrowPdf } from "@/lib/grows/export-pdf";

// Smoke test del render: no valida el layout, solo que la plantilla produce
// un PDF válido sin tirar (regresiones de estilos/props de react-pdf).
describe("renderGrowPdf", () => {
  it("genera un PDF válido con datos completos", async () => {
    const data = buildGrowExportData({
      grow: {
        name: "Cultivo de prueba",
        genetics: "Northern Lights",
        plant_type: "fotoperiodica",
        variety: "hibrida_indica",
        plant_count: 2,
        substrate: "tierra",
        environment: "interior",
        light_type: "led",
        light_schedule: "18/6",
        start_date: "2026-05-01",
        initial_pot_volume_l: 1,
        current_pot_volume_l: 11,
      },
      logs: [
        {
          type: "observation",
          log_date: "2026-05-02",
          data: { notes: "Brotó bien" },
          plant_id: null,
        },
        {
          type: "watering",
          log_date: "2026-05-10",
          data: { volume_l: 1.5, photos: ["user/foto1.jpg"] },
          plant_id: null,
        },
        {
          type: "cosecha",
          log_date: "2026-08-25",
          data: { dry_weight_g: 50, wet_weight_g: 200 },
          plant_id: "p1",
        },
      ],
      plants: [{ id: "p1", label: "Planta A", notes: "Fenotipo alto" }],
      space: { name: "Carpa 80", width_cm: 80, depth_cm: 80, height_cm: 180 },
      email: "test@example.com",
      reprocannExpiresOn: "2026-12-01",
      now: new Date("2026-07-15T12:00:00Z"),
    });

    // 1x1 px PNG transparente, para cubrir la rama de fotos embebidas.
    const px =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const pdf = await renderGrowPdf(data, [
      { path: data.photos[0]?.path ?? "x.jpg", dataUrl: px },
    ]);

    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
