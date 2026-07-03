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
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span>🤖</span> Análisis con IA
        </h2>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? "Analizando…" : "Analizar cultivo"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {analysis && (
        <p className="whitespace-pre-wrap rounded-xl border-l-4 border-lime-500 bg-lime-50 px-4 py-3 text-sm leading-relaxed text-[color:var(--ink)]">
          {analysis}
        </p>
      )}

      {!analysis && !error && !loading && (
        <p className="text-sm text-[color:var(--muted)]">
          Generá una evaluación agronómica a partir de la fase actual y los logs
          recientes de este cultivo.
        </p>
      )}
    </section>
  );
}
