import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Beacon del service worker: cuánto tardó en llegar cada push (ver public/sw.js).
//
// A propósito no toca la base ni exige sesión: es telemetría anónima que
// termina en los logs del server (Vercel → Logs). Filtrando por
// "[push-latency]" se responde la única pregunta que importa cuando alguien
// dice "me llegó tarde": si el número es de segundos, el envío está bien y el
// atraso lo mete el aparato (Doze / ahorro de batería); si es de minutos con
// el teléfono despierto, el problema es nuestro y está del lado del server.
//
// El cuerpo lo manda un cliente cualquiera, así que nada se toma en serio: se
// valida el número y se limpia la etiqueta antes de que toque un log.
const MAX_LATENCY_MS = 24 * 60 * 60 * 1000;
const SLOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { latencyMs, kind } = (body ?? {}) as {
    latencyMs?: unknown;
    kind?: unknown;
  };
  if (
    typeof latencyMs !== "number" ||
    !Number.isFinite(latencyMs) ||
    latencyMs < 0 ||
    latencyMs > MAX_LATENCY_MS
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // `kind` lo pone el server al enviar el push, pero vuelve por el cliente:
  // se recorta y se filtra para que nadie escriba lo que quiera en los logs.
  const safeKind =
    (typeof kind === "string" ? kind.replace(/[^\w:.-]/g, "").slice(0, 40) : "") ||
    "desconocido";

  const line = `[push-latency] kind=${safeKind} ${Math.round(latencyMs / 1000)}s`;
  if (latencyMs >= SLOW_MS) {
    console.warn(`${line} — entrega diferida por el dispositivo`);
  } else {
    console.log(line);
  }
  return NextResponse.json({ ok: true });
}
