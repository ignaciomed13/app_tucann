"use client";

import Image from "next/image";
import { useState } from "react";

export interface AnalysisSnapshot {
  content: string;
  createdAt: string;
}

// Fecha/hora del análisis en horario argentino, estable entre server y
// cliente para no romper la hidratación.
function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnalyzeButton({
  growId,
  initial,
}: {
  growId: string;
  initial?: AnalysisSnapshot | null;
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisSnapshot | null>(
    initial ?? null
  );
  const [error, setError] = useState<string | null>(null);
  // true cuando el server devolvió el análisis de hoy en vez de generar uno.
  const [cachedNotice, setCachedNotice] = useState(false);

  async function runAnalysis(force: boolean) {
    setLoading(true);
    setError(null);
    setCachedNotice(false);
    try {
      const res = await fetch(`/api/grows/${growId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo generar el análisis.");
      } else {
        setAnalysis({ content: json.analysis, createdAt: json.createdAt });
        setCachedNotice(json.cached === true);
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
          <Image
            src="/tucu-face.png"
            alt="Tucu"
            width={345}
            height={224}
            className="h-8 w-auto"
          />
          Tucu analiza tu cultivo
        </h2>
        <button
          onClick={() => runAnalysis(false)}
          disabled={loading}
          className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
        >
          {loading
            ? "Mirando tus plantas…"
            : analysis
              ? "Pedir análisis nuevo"
              : "Pedirle un análisis"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {analysis && (
        <div className={`flex items-start gap-3 ${loading ? "opacity-50" : ""}`}>
          <Image
            src="/tucu-face.png"
            alt=""
            width={345}
            height={224}
            className="mt-1 h-7 w-auto shrink-0"
          />
          <div className="flex-1 rounded-xl rounded-tl-none border border-lime-300 bg-lime-50 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--ink)]">
              {analysis.content}
            </p>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Análisis de Tucu · {formatWhen(analysis.createdAt)}
            </p>
          </div>
        </div>
      )}

      {cachedNotice && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          🕒 Este es el análisis de hoy: lo guardé para no gastar consultas de
          más.
          <button
            onClick={() => runAnalysis(true)}
            disabled={loading}
            className="font-bold underline underline-offset-2 hover:text-amber-900 disabled:opacity-50"
          >
            Analizar de nuevo igual
          </button>
        </p>
      )}

      {!analysis && !error && !loading && (
        <p className="text-sm text-[color:var(--muted)]">
          Pedime un análisis: miro la fase del ciclo, los logs recientes y las
          fotos, y te digo cómo viene el cultivo y qué ajustar. 🔍
        </p>
      )}
    </section>
  );
}
