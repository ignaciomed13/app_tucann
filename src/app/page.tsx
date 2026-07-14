import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";

export const metadata = {
  title: "TuCann — El journal de cultivo para autorizados REPROCANN",
  description:
    "Calculá el riego, seguí cada fase y no dejes vencer tu permiso. TuCann es el journal de cultivo con IA para cultivadores REPROCANN de Argentina.",
};

const diferenciadores = [
  {
    emoji: "🧮",
    title: "Te hace las cuentas",
    body: "Riego calculado sobre el volumen real de tu maceta y recálculo automático de fases al trasplantar. No es un diario donde anotás: es un asistente que calcula.",
  },
  {
    emoji: "🔔",
    title: "Te avisa antes",
    body: "Recordatorios de riego y alertas de cosecha que llegan solos al celular. Y lo más importante: te avisa antes de que se venza tu REPROCANN.",
  },
  {
    emoji: "🇦🇷",
    title: "Pensado para Argentina",
    body: "En español, con el marco REPROCANN adentro y un directorio de growshops locales. No una app global traducida a medias.",
  },
  {
    emoji: "🔒",
    title: "Privado de verdad",
    body: "Tu cultivo es solo tuyo. Cada cuenta ve únicamente sus datos. Compartís algo con la comunidad solo si vos querés.",
  },
];

const features = [
  {
    emoji: "🌱",
    title: "Fases automáticas",
    body: "El ciclo avanza solo y te muestra en qué etapa está cada planta.",
  },
  {
    emoji: "💧",
    title: "Riego preciso",
    body: "10–15% del volumen de la maceta, sin que saques la calculadora.",
  },
  {
    emoji: "🐦",
    title: "Tucu con IA",
    body: "Tu asistente lee el historial del cultivo y te da consejos al toque.",
  },
  {
    emoji: "📅",
    title: "Cosecha perpetua",
    body: "Planificá lotes escalonados con un timeline por fases.",
  },
  {
    emoji: "📊",
    title: "Gráficas del cultivo",
    body: "Seguí la evolución con métricas y curvas de cada lote.",
  },
  {
    emoji: "🤝",
    title: "Socios y growshops",
    body: "Directorio curado de growshops de confianza para conseguir todo.",
  },
];

export default async function LandingPage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-col">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/tucu-face.png"
            alt="Tucu"
            width={44}
            height={44}
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-extrabold tracking-tight">TuCann</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-50"
          >
            Ingresar
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
          >
            Empezá gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-2 md:py-16">
        <div className="flex flex-col gap-6">
          <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-800 ring-1 ring-green-300">
            Para cultivadores REPROCANN 🇦🇷
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Tu cultivo,{" "}
            <span className="text-green-700">en regla y bajo control.</span>
          </h1>
          <p className="max-w-md text-lg text-[color:var(--muted)]">
            TuCann no es otro diario de fotos. Te calcula el riego, te lleva de
            la mano por cada fase y no te deja vencer el permiso. Con{" "}
            <strong className="text-[color:var(--ink)]">Tucu</strong>, tu
            asistente de cultivo con IA.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-green-700 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-green-800"
            >
              Empezá gratis
            </Link>
            <Link
              href="/login"
              className="rounded-full border-2 border-green-700 px-6 py-3 text-base font-bold text-green-800 transition hover:bg-green-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 mx-auto my-auto h-64 w-64 rounded-full bg-lime-200/50 blur-3xl" />
          <Image
            src="/tucu.png"
            alt="Tucu, la mascota de TuCann"
            width={1024}
            height={1536}
            priority
            className="h-80 w-auto drop-shadow-md sm:h-96"
          />
        </div>
      </section>

      {/* Diferenciadores */}
      <section className="bg-white/60 py-14">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              No es otro diario de cultivo
            </h2>
            <p className="mt-3 text-[color:var(--muted)]">
              Los diarios te muestran cómo cultivan otros. TuCann gestiona{" "}
              <em>tu</em> cultivo: calcula, te avisa y te mantiene en regla.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {diferenciadores.map((d) => (
              <div
                key={d.title}
                className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm"
              >
                <div className="text-3xl">{d.emoji}</div>
                <h3 className="mt-3 text-lg font-bold">{d.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Todo lo que tu cultivo necesita
            </h2>
            <p className="mt-3 text-[color:var(--muted)]">
              Desde el primer brote hasta el peso seco de la cosecha.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[color:var(--border)] border-l-4 border-l-green-600 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-3xl">{f.emoji}</div>
                <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comunidad / Foro */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="relative overflow-hidden rounded-3xl bg-green-800 px-8 py-12 text-white shadow-lg">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-400/20 blur-2xl" />
            <span className="rounded-full bg-lime-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-lime-200 ring-1 ring-lime-400/40">
              Próximamente
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white">
              Una comunidad de cultivadores como vos
            </h2>
            <p className="mt-3 max-w-2xl text-green-100">
              Un foro privado, en español, para compartir experiencias y
              resolver dudas entre cultivadores REPROCANN de Argentina.
              Participás con un alias y{" "}
              <strong className="text-white">
                tus datos de cultivo nunca se comparten
              </strong>
              : mostrás solo lo que vos decidís. Sin ruido, sin marcas
              vendiéndote.
            </p>
            <div className="mt-6">
              <Link
                href="/signup"
                className="inline-block rounded-full bg-white px-6 py-3 text-base font-bold text-green-800 shadow-sm transition hover:bg-green-50"
              >
                Sumate desde ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-3xl px-5 text-center">
          <Image
            src="/tucu-face.png"
            alt="Tucu"
            width={72}
            height={72}
            className="mx-auto h-16 w-16 object-contain"
          />
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight">
            Empezá hoy con Tucu de tu lado
          </h2>
          <p className="mt-3 text-[color:var(--muted)]">
            Creá tu cuenta gratis y registrá tu primer cultivo en minutos.
          </p>
          <div className="mt-6">
            <Link
              href="/signup"
              className="inline-block rounded-full bg-green-700 px-8 py-3 text-base font-bold text-white shadow-sm transition hover:bg-green-800"
            >
              Empezá gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[color:var(--border)] py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-[color:var(--muted)] sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/tucu-face.png"
              alt="Tucu"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="font-bold text-[color:var(--ink)]">TuCann</span>
          </div>
          <p>Journal de cultivo para autorizados REPROCANN · Argentina</p>
          <div className="flex gap-4">
            <Link
              href="/privacidad"
              className="font-medium hover:text-green-700"
            >
              Privacidad
            </Link>
            <Link href="/login" className="font-medium hover:text-green-700">
              Ingresar
            </Link>
            <Link href="/signup" className="font-medium hover:text-green-700">
              Registrarse
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
