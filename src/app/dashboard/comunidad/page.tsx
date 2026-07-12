import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AliasForm } from "@/components/forum/alias-form";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { DmToggle } from "@/components/messages/dm-toggle";
import {
  FORUM_CATEGORIES,
  getForumCategory,
  isForumCategorySlug,
} from "@/lib/forum/categories";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export default async function ComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const { seccion } = await searchParams;
  const activeSlug =
    seccion && isForumCategorySlug(seccion) ? seccion : null;
  const activeCategory = activeSlug ? getForumCategory(activeSlug) : null;

  const user = await requireUser();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("forum_alias, forum_dms_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  const alias = settings?.forum_alias ?? null;
  const dmsEnabled = settings?.forum_dms_enabled ?? true;

  // Conteo por sección: una sola query liviana (solo la columna category).
  const { data: categoryRows } = await supabase
    .from("forum_threads")
    .select("category")
    .limit(1000);
  const counts = new Map<string, number>();
  for (const row of categoryRows ?? []) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  let threadsQuery = supabase
    .from("forum_threads")
    .select("id, title, author_alias, category, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (activeSlug) {
    threadsQuery = threadsQuery.eq("category", activeSlug);
  }
  const { data: threads } = await threadsQuery;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">💬 Comunidad</h1>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-green-800 hover:underline"
        >
          ← Volver
        </Link>
      </div>

      <p className="rounded-2xl border border-[color:var(--border)] bg-white p-4 text-sm text-[color:var(--muted)]">
        🔒 Foro privado, solo para miembros. Participás con un alias —{" "}
        <strong className="text-[color:var(--ink)]">
          tus cultivos y datos nunca se comparten acá
        </strong>{" "}
        salvo que vos elijas escribirlos.
      </p>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Secciones</h2>
          {activeCategory && (
            <Link
              href="/dashboard/comunidad"
              className="text-sm font-bold text-green-800 hover:underline"
            >
              ✕ Ver todas las secciones
            </Link>
          )}
        </div>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {FORUM_CATEGORIES.map((c) => {
            const isActive = c.slug === activeSlug;
            const count = counts.get(c.slug) ?? 0;
            return (
              <li key={c.slug}>
                <Link
                  href={`/dashboard/comunidad?seccion=${c.slug}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`block rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isActive
                      ? "border-green-600 ring-2 ring-green-600/30"
                      : "border-[color:var(--border)]"
                  }`}
                >
                  <p className="flex items-baseline justify-between gap-2 font-bold">
                    <span>
                      {c.emoji} {c.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                      {count} {count === 1 ? "tema" : "temas"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {c.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {!alias ? (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Elegí tu alias para participar</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Es el nombre con el que te van a ver los demás. No hace falta que sea
            tu nombre real.
          </p>
          <div className="mt-4">
            <AliasForm defaultAlias={null} />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            {activeCategory
              ? `Abrir un tema en ${activeCategory.name}`
              : "Abrir un tema nuevo"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Posteás como{" "}
            <strong className="text-[color:var(--ink)]">{alias}</strong>.
          </p>
          <div className="mt-4">
            <NewThreadForm defaultCategory={activeSlug ?? undefined} />
          </div>
        </section>
      )}

      {alias && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-white px-5 py-3 shadow-sm">
          <Link
            href="/dashboard/mensajes"
            className="text-sm font-bold text-green-800 hover:underline"
          >
            ✉️ Ver mis mensajes
          </Link>
          <DmToggle enabled={dmsEnabled} />
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          {activeCategory
            ? `${activeCategory.emoji} Temas en ${activeCategory.name}`
            : "Últimos temas"}
        </h2>
        <ul className="flex flex-col gap-3">
          {threads && threads.length === 0 && (
            <li className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center text-sm font-medium text-[color:var(--muted)]">
              {activeCategory
                ? "Todavía no hay temas en esta sección. Sé el primero en abrir uno."
                : "Todavía no hay temas. Sé el primero en abrir uno."}
            </li>
          )}
          {threads?.map((t) => {
            const cat = getForumCategory(t.category);
            return (
              <li key={t.id}>
                <Link
                  href={`/dashboard/comunidad/${t.id}`}
                  className="block rounded-2xl border border-[color:var(--border)] border-l-4 border-l-green-600 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-lg font-bold">{t.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                      {cat.emoji} {cat.name}
                    </span>
                    <span>
                      por {t.author_alias} · {formatDate(t.created_at)}
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
