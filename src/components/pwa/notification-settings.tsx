"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  isEndpointRegistered,
} from "@/lib/notifications/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Msg = { error?: string; success?: string } | null;

export function NotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setSupported(false);
      return;
    }

    // El objeto de suscripción del navegador puede sobrevivir a la fila del
    // servidor (ej. FCM devolvió 410 y la borramos). Si el endpoint local ya no
    // está registrado, esto no está activo: limpiamos y mostramos "Activar".
    async function checkSubscription() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          setSubscribed(false);
          return;
        }
        const registered = await isEndpointRegistered(sub.endpoint);
        if (registered) {
          setSubscribed(true);
          return;
        }
        await sub.unsubscribe().catch(() => {});
        setSubscribed(false);
      } catch {
        /* sin service worker o sin sesión: dejamos el estado por defecto */
      }
    }

    checkSubscription();

    // Una PWA instalada normalmente no recarga la página al reabrirse: retoma
    // el mismo contexto de JS, así que el chequeo de arriba (que sólo corre al
    // montar) nunca se repite. Revalidamos también cada vez que la app vuelve
    // a primer plano, para no quedar con un estado "activadas" viejo.
    function onVisible() {
      if (document.visibilityState === "visible") checkSubscription();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkSubscription);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkSubscription);
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg({ error: "Diste permiso denegado. Activalo en el navegador." });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMsg({ error: "Falta configurar la clave pública VAPID." });
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await subscribeToPush(JSON.parse(JSON.stringify(sub)));
      setMsg(res ?? null);
      setSubscribed(true);
    } catch (e) {
      setMsg({ error: `No se pudo activar: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg({ success: "Notificaciones desactivadas." });
    } catch (e) {
      setMsg({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      // Mandamos el endpoint propio para que la prueba viaje a ESTE dispositivo
      // y no reporte éxito porque llegó a otro.
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setSubscribed(false);
        setMsg({ error: "Este dispositivo no está suscrito. Volvé a activar." });
        return;
      }
      const res = await sendTestNotification(sub.endpoint);
      setMsg(res ?? null);
      if (res?.error) {
        // La prueba falló: puede que el servidor haya borrado la suscripción.
        const registered = await isEndpointRegistered(sub.endpoint);
        if (!registered) {
          await sub.unsubscribe().catch(() => {});
          setSubscribed(false);
        }
      }
    } catch (e) {
      setMsg({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          🔔 Notificaciones
        </h2>
        <div className="flex items-center gap-2">
          {!subscribed ? (
            <button
              onClick={subscribe}
              disabled={busy}
              className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
            >
              {busy ? "…" : "Activar"}
            </button>
          ) : (
            <>
              <button
                onClick={test}
                disabled={busy}
                className="rounded-full border-2 border-green-700 px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50 disabled:opacity-50"
              >
                {busy ? "…" : "Enviar prueba"}
              </button>
              <button
                onClick={unsubscribe}
                disabled={busy}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Desactivar
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-[color:var(--muted)]">
        {subscribed
          ? "Activadas en este dispositivo. Probá que te llegue una."
          : "Activá recordatorios de riego, cosecha y más. En iPhone requiere tener la app instalada."}
      </p>

      {msg?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {msg.error}
        </p>
      )}
      {msg?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200">
          {msg.success}
        </p>
      )}
    </section>
  );
}
