"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  environmentalSeries,
  presentEnvMetrics,
  environmentalByPlant,
  wateringSeries,
  potVolumeSteps,
  eventMarkers,
  harvestBars,
  ENV_METRICS,
  MS_PER_DAY,
  type ChartLog,
  type EnvMetric,
} from "@/lib/grows/charts";

// Contenido de la sección de gráficas. Se carga en un chunk aparte (lazy) para
// que recharts no pese en el bundle inicial: el wrapper (grow-charts.tsx) sólo
// lo monta cuando el usuario abre la sección.

const COLORS = {
  temperature_c: "#e8641b", // clay / calor
  humidity_pct: "#2563eb", // azul / agua en aire
  ec: "#16a34a", // verde
  ph: "#7c3aed", // violeta
  water: "#38bdf8", // celeste
  pot: "#a16207", // tierra
  dry: "#16a34a",
  wet: "#a3e635",
} as const;

// Paleta para las curvas por planta (fenohunting).
const PLANT_PALETTE = ["#16a34a", "#e8641b", "#2563eb", "#7c3aed", "#db2777", "#0891b2"];

const METRIC_META: Record<EnvMetric, { name: string; unit: string; color: string }> = {
  temperature_c: { name: "Temp", unit: "°C", color: COLORS.temperature_c },
  humidity_pct: { name: "Humedad", unit: "%", color: COLORS.humidity_pct },
  ec: { name: "EC", unit: "", color: COLORS.ec },
  ph: { name: "pH", unit: "", color: COLORS.ph },
};

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
}

const axisProps = {
  stroke: "var(--muted)",
  tick: { fontSize: 11, fill: "var(--muted)" },
} as const;

// Eje X temporal base (sin dominio: cada gráfico define el suyo).
const timeXAxis = {
  dataKey: "t",
  type: "number" as const,
  scale: "time" as const,
  tickFormatter: fmtDate,
  ...axisProps,
};

// Dominio del eje X que corresponde a los datos (una serie sola colapsa a un
// punto, y ahí recharts se encarga).
const DATA_DOMAIN = ["dataMin", "dataMax"] as [string, string];

// Dominio que abarca datos + eventos, con un margen, para que las anotaciones
// (poda/trasplante/…) queden dentro del gráfico aunque caigan fuera del rango
// de las lecturas ambientales. Si no hay con qué, cae al dominio de datos.
function spanDomain(...tss: number[][]): [number, number] | [string, string] {
  const all = tss.flat();
  if (all.length === 0) return DATA_DOMAIN;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = Math.max((max - min) * 0.03, MS_PER_DAY);
  return [min - pad, max + pad];
}

// Contenedor con título y alto fijo (ResponsiveContainer necesita un alto).
function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-white p-3">
      <p className="mb-2 text-sm font-bold text-green-800">{title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      {hint && <p className="mt-1 text-xs text-[color:var(--muted)]">{hint}</p>}
    </div>
  );
}

export default function GrowChartsContent({
  logs,
  plantLabels,
  initialPotVolumeL,
  startDate,
}: {
  logs: ChartLog[];
  plantLabels: Record<string, string>;
  initialPotVolumeL: number;
  startDate: string;
}) {
  const envRows = useMemo(() => environmentalSeries(logs), [logs]);
  const metrics = useMemo(() => presentEnvMetrics(envRows), [envRows]);
  const events = useMemo(() => eventMarkers(logs), [logs]);
  const watering = useMemo(() => wateringSeries(logs), [logs]);
  const potSteps = useMemo(
    () => potVolumeSteps(logs, initialPotVolumeL, startDate),
    [logs, initialPotVolumeL, startDate]
  );
  const harvests = useMemo(() => harvestBars(logs, plantLabels), [logs, plantLabels]);
  const perPlant = useMemo(
    () =>
      ENV_METRICS.map((m) => environmentalByPlant(logs, m, plantLabels)).filter(
        (s): s is NonNullable<typeof s> => s !== null
      ),
    [logs, plantLabels]
  );

  const hasTempHum = metrics.includes("temperature_c") || metrics.includes("humidity_pct");
  const hasEcPh = metrics.includes("ec") || metrics.includes("ph");

  // Dominio del eje X de los gráficos de ambiente: abarca las lecturas y también
  // las fechas de los eventos, para que las anotaciones no queden recortadas.
  const envDomain = useMemo(
    () => spanDomain(envRows.map((r) => r.t), events.map((e) => e.t)),
    [envRows, events]
  );

  // Líneas verticales de anotación (poda, trasplante, sanidad, nutrición, riego)
  // sobre los gráficos de ambiente. Cada ReferenceLine tiene que apuntar a un
  // eje Y existente: estos charts usan ejes con id ("temp"/"hum", "ec"/"ph"),
  // no el id 0 por defecto, así que hay que pasarle el yAxisId del gráfico.
  const annotationLines = (yAxisId: string) =>
    events.map((ev, i) => (
      <ReferenceLine
        key={`${ev.date}-${ev.kind}-${i}`}
        x={ev.t}
        yAxisId={yAxisId}
        stroke="var(--muted)"
        strokeWidth={1}
        strokeDasharray="2 3"
        label={{ value: ev.emoji, position: "top", fontSize: 11 }}
      />
    ));

  return (
    <div className="flex flex-col gap-4">
      {/* Ambiente: temperatura y humedad */}
      {hasTempHum && (
        <ChartCard
          title="🌡️ Temperatura y humedad"
          hint={events.length > 0 ? "Marcas ↑ = eventos (riego 💧, poda ✂️, trasplante 🪴, nutrición 🧪, sanidad 🐛)." : undefined}
        >
          <LineChart data={envRows} margin={{ top: 16, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis {...timeXAxis} domain={envDomain} />
            <YAxis yAxisId="temp" {...axisProps} width={34} />
            <YAxis yAxisId="hum" orientation="right" domain={[0, 100]} {...axisProps} width={34} />
            <Tooltip labelFormatter={(t) => fmtDate(t as number)} />
            <Legend />
            {annotationLines("temp")}
            {metrics.includes("temperature_c") && (
              <Line yAxisId="temp" dataKey="temperature_c" name="Temp" unit="°C" stroke={COLORS.temperature_c} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
            {metrics.includes("humidity_pct") && (
              <Line yAxisId="hum" dataKey="humidity_pct" name="Humedad" unit="%" stroke={COLORS.humidity_pct} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
          </LineChart>
        </ChartCard>
      )}

      {/* Ambiente: EC y pH (riego/solución) */}
      {hasEcPh && (
        <ChartCard title="⚗️ EC y pH">
          <LineChart data={envRows} margin={{ top: 16, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis {...timeXAxis} domain={envDomain} />
            <YAxis yAxisId="ec" {...axisProps} width={34} />
            <YAxis yAxisId="ph" orientation="right" domain={[0, 14]} {...axisProps} width={34} />
            <Tooltip labelFormatter={(t) => fmtDate(t as number)} />
            <Legend />
            {annotationLines("ec")}
            {metrics.includes("ec") && (
              <Line yAxisId="ec" dataKey="ec" name="EC" stroke={COLORS.ec} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
            {metrics.includes("ph") && (
              <Line yAxisId="ph" dataKey="ph" name="pH" stroke={COLORS.ph} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            )}
          </LineChart>
        </ChartCard>
      )}

      {/* Curvas por planta (fenohunting) */}
      {perPlant.map((series) => (
        <ChartCard
          key={series.metric}
          title={`🌱 ${METRIC_META[series.metric].name} por planta`}
          hint="Compará el comportamiento de cada planta del lote."
        >
          <LineChart data={series.rows} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis {...timeXAxis} domain={DATA_DOMAIN} />
            <YAxis {...axisProps} width={34} />
            <Tooltip labelFormatter={(t) => fmtDate(t as number)} />
            <Legend />
            {series.labels.map((label, i) => (
              <Line
                key={label}
                dataKey={label}
                name={label}
                stroke={PLANT_PALETTE[i % PLANT_PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartCard>
      ))}

      {/* Riego */}
      {watering.length > 0 && (
        <ChartCard title="💧 Riego">
          <BarChart data={watering} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis {...timeXAxis} domain={DATA_DOMAIN} />
            <YAxis {...axisProps} width={34} />
            <Tooltip labelFormatter={(t) => fmtDate(t as number)} />
            <Bar dataKey="volume_l" name="Riego" unit=" L" fill={COLORS.water} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
      )}

      {/* Volumen de maceta (escalones por trasplante) */}
      {potSteps && (
        <ChartCard title="🪴 Tamaño de maceta" hint="Sube en cada trasplante.">
          <LineChart data={potSteps} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis {...timeXAxis} domain={DATA_DOMAIN} />
            <YAxis {...axisProps} width={34} />
            <Tooltip labelFormatter={(t) => fmtDate(t as number)} />
            <Line type="stepAfter" dataKey="volume_l" name="Maceta" unit=" L" stroke={COLORS.pot} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>
      )}

      {/* Cosecha: peso seco por planta / lote */}
      {harvests.length > 0 && (
        <ChartCard
          title="🌾 Cosecha (peso seco)"
          hint={harvests.length > 1 ? "Ranking de rendimiento por planta." : undefined}
        >
          <BarChart data={harvests} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={34} />
            <Tooltip />
            <Legend />
            <Bar dataKey="dry_weight_g" name="Peso seco" unit=" g" fill={COLORS.dry} radius={[3, 3, 0, 0]} />
            {harvests.some((h) => h.wet_weight_g !== undefined) && (
              <Bar dataKey="wet_weight_g" name="Peso fresco" unit=" g" fill={COLORS.wet} radius={[3, 3, 0, 0]} />
            )}
          </BarChart>
        </ChartCard>
      )}
    </div>
  );
}
