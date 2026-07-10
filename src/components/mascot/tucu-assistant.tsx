"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tucu-assistant";
const ROTATE_MS = 12000;

/**
 * Tucu como asistente flotante: flota en la esquina inferior derecha con un
 * globo que rota consejos contextuales. Se puede minimizar a una burbuja
 * (persistido en localStorage) y tocarlo pasa al consejo siguiente.
 */
export function TucuAssistant({ tips }: { tips: string[] }) {
  // "hidden" hasta leer localStorage para no romper la hidratación.
  const [mode, setMode] = useState<"hidden" | "open" | "min">("hidden");
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setMode(localStorage.getItem(STORAGE_KEY) === "off" ? "min" : "open");
  }, []);

  useEffect(() => {
    if (mode !== "open" || tips.length < 2) return;
    const timer = setInterval(
      () => setTipIndex((i) => (i + 1) % tips.length),
      ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [mode, tips.length]);

  if (mode === "hidden" || tips.length === 0) return null;

  if (mode === "min") {
    return (
      <button
        type="button"
        aria-label="Activar a Tucu, el asistente"
        title="Activar a Tucu"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "on");
          setMode("open");
        }}
        className="tucu-enter fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-green-700 bg-white shadow-lg transition hover:scale-110"
      >
        <Image
          src="/tucu-face.png"
          alt=""
          width={345}
          height={224}
          className="h-9 w-auto"
        />
      </button>
    );
  }

  return (
    <div className="tucu-enter fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
      <div className="relative max-w-[280px] rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 pr-8 text-sm shadow-lg">
        <button
          type="button"
          aria-label="Desactivar a Tucu"
          title="Desactivar a Tucu"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "off");
            setMode("min");
          }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-[color:var(--muted)] transition hover:bg-neutral-100 hover:text-[color:var(--ink)]"
        >
          ✕
        </button>
        <p key={tipIndex} className="tucu-tip leading-snug">
          {tips[tipIndex]}
        </p>
        {/* colita del globo */}
        <div className="absolute -bottom-1.5 right-10 h-3 w-3 rotate-45 border-b border-r border-[color:var(--border)] bg-white" />
      </div>
      <button
        type="button"
        aria-label="Siguiente consejo de Tucu"
        title="Siguiente consejo"
        onClick={() => setTipIndex((i) => (i + 1) % tips.length)}
        className="tucu-float cursor-pointer"
      >
        <Image
          src="/tucu.png"
          alt="Tucu, la mascota de TuCann"
          width={445}
          height={800}
          className="h-28 w-auto drop-shadow-md"
        />
      </button>
    </div>
  );
}
