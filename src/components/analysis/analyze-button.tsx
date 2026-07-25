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
    // Burbuja de chat: avatar de Tucu + globo blanco con la punta arriba a la
    // izquierda, como si te estuviera hablando.
    <section className="flex items-start gap-2.5">
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-lime-300 bg-white">
        <Image
          src="/tucu-face.png"
          alt="Tucu"
          width={345}
          height={224}
          className="w-10"
        />
      </div>

      <div className="flex-1 rounded-2xl rounded-tl-[4px] border border-[color:var(--border)] bg-white p-3.5 shadow-sm">
        {analysis ? (
          <>
            <p
              className={`whitespace-pre-wrap text-[13px] leading-relaxed text-[color:var(--ink)] ${loading ? "opacity-50" : ""}`}
            >
              {analysis.content}
            </p>
            <p className="mt-1.5 text-[11px] text-[color:var(--faint)]">
              Análisis de Tucu · {formatWhen(analysis.createdAt)}
            </p>
          </>
        ) : (
          <p className="text-[13px] leading-relaxed text-[color:var(--ink)]">
            Pedime un análisis: miro la fase del ciclo, los logs recientes y las
            fotos, y te digo cómo viene el cultivo y qué ajustar. 🔍
          </p>
        )}

        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        {cachedNotice && (
          <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
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

        <button
          onClick={() => runAnalysis(false)}
          disabled={loading}
          className="mt-2.5 rounded-full bg-[color:var(--accent)] px-3.5 py-2 text-xs font-extrabold text-[color:var(--ink)] transition hover:brightness-95 disabled:opacity-50"
        >
          {loading
            ? "Mirando tus plantas…"
            : analysis
              ? "Pedime un análisis nuevo"
              : "Pedime un análisis"}
        </button>
      </div>
    </section>
  );
}
