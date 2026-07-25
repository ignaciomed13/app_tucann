import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AliasForm } from "@/components/forum/alias-form";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { DmToggle } from "@/components/messages/dm-toggle";
import { FORUM_CATEGORIES, getForumCategory } from "@/lib/forum/categories";
import { Hero } from "@/components/ui/hero";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export default async function ComunidadPage() {
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

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("id, title, author_alias, category, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div className="flex flex-col gap-5">
      <Hero
        back={{ href: "/dashboard", label: "← Volver" }}
        title="💬 Comunidad"
        chip={
          <p className="text-xs font-semibold leading-relaxed text-lime-100">
            🔒 Foro privado con alias — tus cultivos nunca se comparten acá
            salvo que vos elijas escribirlos.
          </p>
        }
      />

      <section>
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[color:var(--brand-strong)]">
          Secciones
        </h2>
        <ul className="mt-2.5 grid grid-cols-2 gap-2.5">
          {FORUM_CATEGORIES.map((c) => {
            const count = counts.get(c.slug) ?? 0;
            return (
              <li key={c.slug}>
                <Link
                  href={`/dashboard/comunidad/seccion/${c.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-[color:var(--border)] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-600 hover:shadow-md"
                >
                  <p className="flex items-baseline justify-between gap-2 text-[13px] font-extrabold">
                    <span>
                      {c.emoji} {c.name}
                    </span>
                    <span
                      title={`${count} ${count === 1 ? "tema" : "temas"}`}
                      className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800"
                    >
                      {count}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11px] text-[color:var(--faint)]">
                    {c.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {!alias ? (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <h2 className="text-[15px] font-extrabold">
            Elegí tu alias para participar
          </h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Es el nombre con el que te van a ver los demás. No hace falta que sea
            tu nombre real.
          </p>
          <div className="mt-3">
            <AliasForm defaultAlias={null} />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <h2 className="text-[15px] font-extrabold">Abrir un tema nuevo</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Posteás como{" "}
            <strong className="text-[color:var(--ink)]">{alias}</strong>. Elegí
            la sección en el formulario.
          </p>
          <div className="mt-3">
            <NewThreadForm />
          </div>
        </section>
      )}

      {alias && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 shadow-sm">
          <Link
            href="/dashboard/mensajes"
            className="text-[13px] font-bold text-[color:var(--brand-strong)] hover:underline"
          >
            ✉️ Ver mis mensajes
          </Link>
          <DmToggle enabled={dmsEnabled} />
        </div>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[color:var(--brand-strong)]">
          Últimos temas
        </h2>
        <ul className="flex flex-col gap-2.5">
          {threads && threads.length === 0 && (
            <li className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center text-sm font-medium text-[color:var(--muted)]">
              Todavía no hay temas. Sé el primero en abrir uno.
            </li>
          )}
          {threads?.map((t) => {
            const cat = getForumCategory(t.category);
            return (
              <li key={t.id}>
                <Link
                  href={`/dashboard/comunidad/${t.id}`}
                  className="block rounded-xl border border-[color:var(--border)] border-l-4 border-l-green-700 bg-white px-3.5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--faint)]">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-800">
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
