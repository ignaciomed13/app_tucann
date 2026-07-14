import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Política de privacidad — TuCann",
  description:
    "Qué datos guarda TuCann, dónde viven, qué hacemos (y qué no) con ellos, y cómo borrar tu cuenta.",
};

// TODO antes del deploy público: reemplazar por la casilla dedicada de TuCann.
const CONTACT_EMAIL = "[email de contacto — pendiente]";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[color:var(--muted)]">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="flex flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/tucu-face.png"
            alt="Tucu"
            width={44}
            height={44}
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-extrabold tracking-tight">TuCann</span>
        </Link>
        <Link
          href="/"
          className="rounded-full px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
        >
          ← Volver
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Política de privacidad
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Última actualización: 13 de julio de 2026
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--muted)]">
            TuCann es un journal de cultivo para personas autorizadas por el
            REPROCANN en Argentina. Sabemos que los datos de un cultivo son
            sensibles, y la app está diseñada alrededor de eso: tus datos son
            tuyos, nadie más los ve, y podés borrarlos todos cuando quieras.
            Esta página explica en criollo qué guardamos, dónde y para qué.
          </p>
        </div>

        <Section title="Qué datos guardamos">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong className="text-[color:var(--ink)]">Tu cuenta:</strong>{" "}
              email y contraseña (la contraseña se guarda cifrada; nunca la
              vemos en texto plano).
            </li>
            <li>
              <strong className="text-[color:var(--ink)]">Tu cultivo:</strong>{" "}
              los cultivos, logs (riego, nutrición, trasplantes, sanidad,
              cosecha, etc.), plantas, espacios y las fotos que subís.
            </li>
            <li>
              <strong className="text-[color:var(--ink)]">REPROCANN:</strong>{" "}
              opcionalmente, la fecha de vencimiento de tu autorización — solo
              si la cargás para recibir avisos. No pedimos el número de
              trámite, la credencial ni ningún otro dato del registro.
            </li>
            <li>
              <strong className="text-[color:var(--ink)]">Comunidad:</strong>{" "}
              tu alias del foro, tus temas y respuestas, y tus mensajes
              privados.
            </li>
            <li>
              <strong className="text-[color:var(--ink)]">
                Notificaciones:
              </strong>{" "}
              si activás los avisos, la suscripción push de tu navegador (un
              identificador técnico, no tu ubicación ni tu contacto).
            </li>
          </ul>
        </Section>

        <Section title="Dónde viven tus datos">
          <p>
            La base de datos y las fotos están en{" "}
            <strong className="text-[color:var(--ink)]">Supabase</strong>{" "}
            (Postgres + almacenamiento privado) y la app corre en{" "}
            <strong className="text-[color:var(--ink)]">Vercel</strong>. Cada
            cuenta está aislada a nivel de base de datos (Row-Level Security):
            aunque hubiera un error en la app, la base solo te deja leer y
            escribir tus propias filas. Las fotos viven en un bucket privado,
            en una carpeta por usuario, y se sirven con enlaces firmados
            temporales — no hay URLs públicas.
          </p>
        </Section>

        <Section title="El análisis con IA (Tucu)">
          <p>
            Cuando pedís un análisis, le mandamos a la API de{" "}
            <strong className="text-[color:var(--ink)]">Google Gemini</strong>{" "}
            el historial del cultivo y hasta 4 fotos recientes para que Tucu te
            responda. Ese envío es necesario para la función y ocurre solo
            cuando vos pedís el análisis.
          </p>
          <p>
            Con total honestidad: hoy usamos el nivel gratuito de esa API, y
            bajo esas condiciones{" "}
            <strong className="text-[color:var(--ink)]">
              Google puede usar el contenido enviado para mejorar sus servicios
              y puede ser revisado por personas
            </strong>
            . Si eso no te cierra, simplemente no uses el análisis de Tucu: el
            resto de la app no manda nada a Google. Antes de un lanzamiento
            público está previsto pasar al nivel pago, donde Google no usa los
            datos para entrenar; cuando eso pase, vamos a actualizar esta
            política.
          </p>
        </Section>

        <Section title="Qué NO hacemos">
          <ul className="list-inside list-disc space-y-1">
            <li>No vendemos ni compartimos tus datos con nadie.</li>
            <li>No hay perfiles públicos ni feed social: nada tuyo es indexable desde afuera.</li>
            <li>
              Tus cultivos jamás se comparten solos: en el foro se ve
              únicamente lo que vos escribís a mano, bajo tu alias.
            </li>
            <li>No usamos publicidad ni trackers de terceros.</li>
          </ul>
        </Section>

        <Section title="Borrar tu cuenta">
          <p>
            Podés borrar tu cuenta vos mismo desde{" "}
            <strong className="text-[color:var(--ink)]">
              Cuenta → Zona de riesgo
            </strong>
            , sin escribirle a nadie. Se elimina todo de inmediato y sin
            retención: cultivos, logs, fotos, análisis, ajustes, tus temas del
            foro (con sus respuestas) y tus mensajes privados (que se borran
            para ambas partes). No guardamos copias de cortesía: borrado es
            borrado.
          </p>
        </Section>

        <Section title="Contacto">
          <p>
            Por cualquier duda sobre tus datos escribinos a{" "}
            <strong className="text-[color:var(--ink)]">
              {CONTACT_EMAIL}
            </strong>
            .
          </p>
        </Section>
      </div>

      <footer className="mt-auto border-t border-[color:var(--border)] py-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-5 text-sm text-[color:var(--muted)]">
          <Image
            src="/tucu-face.png"
            alt="Tucu"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="font-bold text-[color:var(--ink)]">TuCann</span>
          <span>· Journal de cultivo para autorizados REPROCANN</span>
        </div>
      </footer>
    </main>
  );
}
