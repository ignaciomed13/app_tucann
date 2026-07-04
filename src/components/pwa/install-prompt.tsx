"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detección client-only (navigator/matchMedia): correcto en effect para
    // evitar mismatch de hidratación.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsIOS(
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
        !/crios|fxios/i.test(navigator.userAgent)
    );
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari
        (navigator as { standalone?: boolean }).standalone === true
    );
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Ya instalada, descartada, o sin forma de instalar → no mostrar nada.
  if (standalone || dismissed) return null;
  if (!deferred && !isIOS) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setDismissed(true);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-300 bg-green-50 px-4 py-3">
      <p className="text-sm font-medium text-green-900">
        📲 Instalá TuCann en tu celular
        {isIOS && !deferred
          ? ": tocá Compartir ⎋ y luego “Agregar a inicio”."
          : " para acceso rápido y pantalla completa."}
      </p>
      <div className="flex items-center gap-2">
        {deferred && (
          <button
            onClick={install}
            className="rounded-full bg-green-700 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
          >
            Instalar
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-sm font-medium text-green-800 hover:underline"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
