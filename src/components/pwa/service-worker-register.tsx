"use client";

import { useEffect } from "react";

// Registra el service worker una vez en el cliente para habilitar la
// instalación de la PWA.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Silencioso: la app funciona igual sin SW, solo no es instalable.
        });
    }
  }, []);

  return null;
}
