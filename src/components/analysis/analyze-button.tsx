"use client";

import { useState } from "react";

export function AnalyzeButton({ growId }: { growId: string }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/grows/${growId}/analyze`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo generar el análisis.");
      } else {
        setAnalysis(json.analysis);
      }
    } catch {
      setError("Error de red al pedir el análisis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Análisis con IA</h2>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Analizando…" : "Analizar cultivo"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {analysis && (
        <p className="whitespace-pre-wrap text-sm text-neutral-800">
          {analysis}
        </p>
      )}

      {!analysis && !error && !loading && (
        <p className="text-sm text-neutral-500">
          Genera una evaluación agronómica a partir de la fase actual y los logs
          recientes de este cultivo.
        </p>
      )}
    </section>
  );
}
