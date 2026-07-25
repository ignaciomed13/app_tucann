"use client";

import { useState } from "react";

// Descarga la bitácora del cultivo en PDF. La generación server-side puede
// tardar unos segundos (baja fotos del bucket), por eso hay loading state.
export function ExportPdfButton({
  growId,
  variant = "pill",
}: {
  growId: string;
  /** "hero": botón circular sobre el verde del hero. */
  variant?: "pill" | "hero";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/grows/${growId}/export`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "No se pudo generar el PDF.");
        return;
      }
      // El filename viene en Content-Disposition; lo extraemos para el <a>.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "bitacora.pdf";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Error de red al generar el PDF.");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "hero") {
    return (
      <button
        onClick={download}
        disabled={loading}
        aria-label="Exportar bitácora en PDF"
        title={error ?? "Exportar bitácora en PDF"}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm transition hover:bg-white/25 disabled:opacity-50"
      >
        {loading ? "…" : "⬇️"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={download}
        disabled={loading}
        className="rounded-full border border-green-700 px-3 py-1 text-xs font-bold text-green-800 transition hover:bg-green-50 disabled:opacity-50"
      >
        {loading ? "Generando PDF…" : "📄 Exportar PDF"}
      </button>
      {error && (
        <p className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
