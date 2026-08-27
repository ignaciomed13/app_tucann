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

// Reporta cuánto tardó el aviso desde que el server lo mandó (sentAt) hasta
// que el aparato lo entregó. Va al server porque en un celular no hay consola
// que mirar: sin esto, "llega tarde" es imposible de medir, y el atraso puede
// estar en el envío (arreglable acá) o en la cola del sistema operativo
// (Doze/FCM: se arregla con la prioridad del push y los permisos de batería).
//
// Es una estimación: usa el reloj del aparato contra el del server, así que un
// celular con la hora mal da un número raro. Por eso se descartan los valores
// imposibles (negativos o de más de un día) en lugar de ensuciar los logs.
function reportLatency(data) {
  if (typeof data.sentAt !== "number") return Promise.resolve();
  const latencyMs = Date.now() - data.sentAt;
  if (latencyMs < 0 || latencyMs > 86400000) return Promise.resolve();
  return fetch("/api/push-latency", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latencyMs, kind: data.kind || "desconocido" }),
    keepalive: true,
  }).catch(() => {
    /* medir no puede romper el aviso: si el beacon falla, se ignora */
  });
}

// Muestra la notificación push recibida.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "TuCann";
  const options = {
    body: data.body || "",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      reportLatency(data),
    ])
  );
});

// Al tocar la notificación, abre (o enfoca) la app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
