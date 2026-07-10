"use client"; // Los error boundaries deben ser Client Components.

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary del segmento /dashboard: si una page falla al cargar datos
 * (Supabase caído, Gemini, etc.), en vez de una pantalla en blanco mostramos
 * a Tucu con un botón para reintentar. `unstable_retry` (Next 16.2) reintenta
 * el fetch + render del segmento sin recargar toda la app.
 */
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Error en el dashboard:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-white px-6 py-10 text-center shadow-sm">
      <Image
        src="/tucu-face.png"
        alt="Tucu"
        width={345}
        height={224}
        className="h-16 w-auto opacity-90"
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-[color:var(--ink)]">
          Uh, algo se me enredó
        </h2>
        <p className="max-w-sm text-sm text-[color:var(--muted)]">
          No pude cargar esta parte. Puede ser algo temporal: probá de nuevo en
          un momento.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Código: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
