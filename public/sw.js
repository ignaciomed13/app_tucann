// Service worker mínimo para que la app sea instalable (PWA).
// No cachea contenido para evitar servir versiones viejas: la app siempre
// carga desde la red. La sola presencia del SW habilita la instalación.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handler de fetch passthrough (deja que el navegador maneje cada request).
self.addEventListener("fetch", () => {});
