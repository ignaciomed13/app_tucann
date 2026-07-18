import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { GrowExportData } from "@/lib/grows/export";

// Foto ya descargada del bucket, lista para embeber en el PDF.
export interface PhotoBytes {
  path: string;
  dataUrl: string; // data:image/...;base64,...
}

const GREEN = "#15803d";
const INK = "#1c1917";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREEN },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 2 },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  fieldRow: { flexDirection: "row", marginBottom: 3 },
  fieldLabel: { width: 130, color: MUTED },
  fieldValue: { flex: 1 },
  logRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  logDate: { width: 68 },
  logType: { width: 100, fontFamily: "Helvetica-Bold" },
  logDetail: { flex: 1 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoCell: { width: 160 },
  photo: {
    width: 160,
    height: 120,
    objectFit: "cover",
    borderRadius: 4,
  },
  photoCaption: { fontSize: 8, color: MUTED, marginTop: 2 },
  note: { fontSize: 8, color: MUTED, marginTop: 6 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function GrowExportDocument({
  data,
  photos,
}: {
  data: GrowExportData;
  photos: PhotoBytes[];
}) {
  const photoByPath = new Map(photos.map((p) => [p.path, p.dataUrl]));

  return (
    <Document
      title={`Bitácora de cultivo — ${data.growName}`}
      author="TuCann"
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Bitácora de cultivo — {data.growName}</Text>
        <Text style={styles.subtitle}>
          Generada con TuCann el {data.generatedOn} · {data.cultivator.email}
          {data.cultivator.reprocannExpiresOn
            ? ` · REPROCANN vence: ${data.cultivator.reprocannExpiresOn}`
            : ""}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del cultivo</Text>
          {data.fields.map((f) => (
            <Field key={f.label} label={f.label} value={f.value} />
          ))}
        </View>

        {data.plants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plantas / fenotipos</Text>
            {data.plants.map((p) => (
              <Field
                key={p.label}
                label={p.label}
                value={p.notes ?? "—"}
              />
            ))}
          </View>
        )}

        {data.harvest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen de cosecha</Text>
            <Field
              label="Peso seco total"
              value={`${data.harvest.totalDryG} g`}
            />
            {data.harvest.totalWetG > 0 && (
              <Field
                label="Peso en fresco"
                value={`${data.harvest.totalWetG} g`}
              />
            )}
            {data.harvest.perPlantG !== null && (
              <Field label="Por planta" value={`${data.harvest.perPlantG} g`} />
            )}
            {data.harvest.dryYieldPct !== null && (
              <Field
                label="Merma de secado"
                value={`${data.harvest.dryYieldPct}%`}
              />
            )}
            <Field label="Última cosecha" value={data.harvest.lastDate} />
            {data.harvest.ranking.length > 0 && (
              <>
                <Text style={{ ...styles.fieldLabel, marginTop: 4 }}>
                  Rendimiento por planta:
                </Text>
                {data.harvest.ranking.map((r) => (
                  <Field key={r.label} label={r.label} value={`${r.grams} g`} />
                ))}
              </>
            )}
            {data.harvest.entryCount > 1 && (
              <Text style={styles.note}>
                Suma de {data.harvest.entryCount} cosechas parciales.
              </Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Historial ({data.timeline.length}{" "}
            {data.timeline.length === 1 ? "registro" : "registros"})
          </Text>
          {data.timeline.length === 0 ? (
            <Text style={styles.note}>Sin registros cargados.</Text>
          ) : (
            data.timeline.map((entry, i) => (
              <View key={i} style={styles.logRow} wrap={false}>
                <Text style={styles.logDate}>{entry.date}</Text>
                <Text style={styles.logType}>{entry.typeLabel}</Text>
                <Text style={styles.logDetail}>
                  {entry.plantLabel ? `[${entry.plantLabel}] ` : ""}
                  {entry.detail}
                  {entry.photoCount > 0
                    ? ` (${entry.photoCount} ${entry.photoCount === 1 ? "foto" : "fotos"})`
                    : ""}
                </Text>
              </View>
            ))
          )}
        </View>

        {photos.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <View style={styles.photoGrid}>
              {data.photos.map((p) =>
                photoByPath.has(p.path) ? (
                  <View key={p.path} style={styles.photoCell} wrap={false}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image
                      style={styles.photo}
                      src={photoByPath.get(p.path)!}
                    />
                    <Text style={styles.photoCaption}>
                      {p.date} · {p.typeLabel}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
            {data.omittedPhotoCount > 0 && (
              <Text style={styles.note}>
                Se muestran las {data.photos.length} fotos más recientes de{" "}
                {data.photos.length + data.omittedPhotoCount} totales.
              </Text>
            )}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Bitácora generada con TuCann
        </Text>
      </Page>
    </Document>
  );
}

export async function renderGrowPdf(
  data: GrowExportData,
  photos: PhotoBytes[]
): Promise<Buffer> {
  return renderToBuffer(<GrowExportDocument data={data} photos={photos} />);
}
