import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Hero verde full-bleed, el encabezado común de todas las pantallas del
 * dashboard. Se sale del padding del <main> con márgenes negativos para pegarse
 * al header y ocupar todo el ancho del contenedor.
 */
export function Hero({
  back,
  actions,
  eyebrow,
  title,
  subtitle,
  leading,
  chip,
}: {
  back?: { href: string; label: string };
  actions?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  chip?: ReactNode;
}) {
  return (
    <section className="relative -mx-5 -mt-5 mb-1 overflow-hidden bg-[color:var(--brand-strong)] px-5 pb-6 pt-3 text-white">
      {/* halo lima decorativo de la esquina superior derecha */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-8 h-44 w-44 rounded-full bg-[color:var(--accent)] opacity-[.16] blur-lg"
      />

      {(back || actions) && (
        <div className="relative flex items-center justify-between gap-3">
          {back ? (
            <Link
              href={back.href}
              className="text-[13px] font-semibold text-green-200 transition hover:text-white"
            >
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="relative mt-4 flex items-center gap-4">
        {leading}
        <div className="min-w-0">
          {eyebrow}
          <h1 className="text-2xl font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-xs text-green-200">{subtitle}</p>
          )}
        </div>
      </div>

      {chip && (
        <div className="relative mt-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
          {chip}
        </div>
      )}
    </section>
  );
}

/** Botón circular de acción dentro del hero (✏️, ⬇️, 👤…). */
export function HeroAction({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm transition hover:bg-white/25"
    >
      {children}
    </Link>
  );
}

/** Chip del hero con etiqueta a la izquierda y valor destacado a la derecha. */
export function HeroStat({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold text-lime-100">{label}</span>
      <span className="shrink-0 text-[15px] font-extrabold">{value}</span>
    </div>
  );
}
