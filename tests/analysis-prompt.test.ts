import { describe, expect, it } from "vitest";
import {
  buildAnalysisPrompt,
  type GrowForAnalysis,
  type LogForAnalysis,
} from "@/lib/analysis/prompt";

const grow: GrowForAnalysis = {
  name: "Cultivo test",
  genetics: "Northern Lights",
  plant_type: "fotoperiodica",
  variety: null,
  plant_count: 1,
  substrate: "tierra",
  environment: "interior",
  light_type: "led",
  light_schedule: "18/6",
  start_date: "2026-05-20",
  initial_pot_volume_l: 2,
  current_pot_volume_l: 2,
};

const today = new Date("2026-07-03T12:00:00Z"); // semana 7 → vegetativo

describe("buildAnalysisPrompt", () => {
  it("incluye genética, semana, fase y volumen de maceta", () => {
    const prompt = buildAnalysisPrompt(grow, [], today);
    expect(prompt).toContain("Northern Lights");
    expect(prompt).toContain("Semana del ciclo: 7 de 19");
    expect(prompt).toContain("Vegetativo");
    expect(prompt).toContain("actual 2 L");
  });

  it("incluye sustrato, ambiente e iluminación", () => {
    const prompt = buildAnalysisPrompt(
      { ...grow, substrate: "coco", environment: "exterior", light_type: "natural" },
      [],
      today
    );
    expect(prompt).toContain("Sustrato: Coco");
    expect(prompt).toContain("Ambiente: Exterior");
    expect(prompt).toContain("Iluminación: Natural / Sol");
    expect(prompt).toContain("Fotoperíodo: 18/6");
  });

  it("agrega la alerta de maceta cuando corresponde", () => {
    const prompt = buildAnalysisPrompt(grow, [], today);
    expect(prompt).toContain("ALERTA DEL SISTEMA");
    expect(prompt).toContain("Maceta chica");
  });

  it("no incluye alerta cuando la maceta es suficiente", () => {
    const prompt = buildAnalysisPrompt(
      { ...grow, current_pot_volume_l: 11 },
      [],
      today
    );
    expect(prompt).not.toContain("ALERTA DEL SISTEMA");
  });

  it("lista los logs con su fecha, tipo y datos formateados", () => {
    const logs: LogForAnalysis[] = [
      { type: "environmental", log_date: "2026-07-01", data: { temperature_c: 25, humidity_pct: 60 } },
      { type: "watering", log_date: "2026-06-30", data: { volume_l: 0.3 } },
    ];
    const prompt = buildAnalysisPrompt(grow, logs, today);
    expect(prompt).toContain("Logs recientes (2");
    expect(prompt).toContain("[2026-07-01] Ambiental: 25 °C · 60% HR");
    expect(prompt).toContain("[2026-06-30] Riego: 0.3 L aplicados");
  });

  it("indica cuando no hay logs", () => {
    expect(buildAnalysisPrompt(grow, [], today)).toContain(
      "No hay logs registrados todavía."
    );
  });

  it("marca cuando el ciclo no comenzó", () => {
    const prompt = buildAnalysisPrompt(
      { ...grow, start_date: "2026-08-01" },
      [],
      today
    );
    expect(prompt).toContain("El ciclo todavía no comenzó.");
  });

  it("incluye la cantidad de plantas cuando es un lote", () => {
    expect(buildAnalysisPrompt({ ...grow, plant_count: 50 }, [], today)).toContain(
      "Cantidad de plantas: 50 (lote)"
    );
    // con 1 planta no agrega la línea
    expect(buildAnalysisPrompt(grow, [], today)).not.toContain("Cantidad de plantas");
  });

  it("incluye la variedad cuando está definida", () => {
    const prompt = buildAnalysisPrompt(
      { ...grow, variety: "hibrida_sativa" },
      [],
      today
    );
    expect(prompt).toContain("Variedad: Híbrida (predom. sativa)");
  });

  it("anota la planta individual en los logs de fenohunting", () => {
    const logs: LogForAnalysis[] = [
      { type: "observation", log_date: "2026-07-01", data: { notes: "más resina" }, plantLabel: "A1" },
      { type: "watering", log_date: "2026-06-30", data: { volume_l: 0.3 } },
    ];
    const prompt = buildAnalysisPrompt(grow, logs, today);
    expect(prompt).toContain("Observaciones {planta A1}: más resina");
    // el log del lote no lleva etiqueta de planta
    expect(prompt).toContain("Riego: 0.3 L aplicados");
    expect(prompt).not.toContain("Riego {planta");
  });

  it("incluye el espacio y marca sobrepoblación", () => {
    const prompt = buildAnalysisPrompt(grow, [], today, {
      name: "Carpa 100×100",
      width_cm: 100,
      depth_cm: 100,
      height_cm: 200,
      plantCount: 12, // 12 en 1 m² → sobrepoblado
    });
    expect(prompt).toContain("Espacio: Carpa 100×100");
    expect(prompt).toContain("1 m²");
    expect(prompt).toContain("SOBREPOBLADO");
  });

  it("incluye el tipo de planta y, para autos, la alerta no menciona trasplante", () => {
    const auto = buildAnalysisPrompt(
      { ...grow, plant_type: "autofloreciente" },
      [],
      today
    );
    expect(auto).toContain("Tipo de planta: Autofloreciente");
    expect(auto).toContain("maceta definitiva");
    // la alerta de una auto no debe RECOMENDAR trasplante
    const alertLine = auto
      .split("\n")
      .find((l) => l.startsWith("ALERTA DEL SISTEMA"));
    expect(alertLine).toBeDefined();
    expect(alertLine).not.toContain("Considerá trasplantar");
  });
});
