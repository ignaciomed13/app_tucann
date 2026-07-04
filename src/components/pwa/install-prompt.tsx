"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "other";

const DISMISS_KEY = "tucann-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [platform, setPlatform] = useState<Platform>("other");
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true); // oculto hasta chequear cliente

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      // iPad con iPadOS se reporta como Mac con touch
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    const isMobile = isIOS || isAndroid || /mobi/i.test(ua);

    /* eslint-disable react-hooks/set-state-in-effect */
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true
    );
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : isMobile ? "other" : "desktop");
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  const instructions =
    platform === "ios"
      ? "Tocá Compartir ⎋ abajo y luego “Agregar a inicio”."
      : platform === "android"
        ? "Abrí el menú ⋮ del navegador y tocá “Instalar app” o “Agregar a pantalla de inicio”."
        : "Buscá el ícono de instalar ⊕ en la barra de direcciones del navegador.";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-300 bg-green-50 px-4 py-3">
      <p className="text-sm font-medium text-green-900">
        📲 <strong>Instalá TuCann</strong> en tu dispositivo —{" "}
        {deferred ? "en un toque, para acceso rápido y pantalla completa." : instructions}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {deferred && (
          <button
            onClick={install}
            className="rounded-full bg-green-700 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
          >
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-sm font-medium text-green-800 hover:underline"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
