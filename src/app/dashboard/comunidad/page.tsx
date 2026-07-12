import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AliasForm } from "@/components/forum/alias-form";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { DmToggle } from "@/components/messages/dm-toggle";

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

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("id, title, author_alias, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

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
          <h2 className="text-lg font-bold">Abrir un tema nuevo</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Posteás como{" "}
            <strong className="text-[color:var(--ink)]">{alias}</strong>.
          </p>
          <div className="mt-4">
            <NewThreadForm />
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

      <ul className="flex flex-col gap-3">
        {threads && threads.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center text-sm font-medium text-[color:var(--muted)]">
            Todavía no hay temas. Sé el primero en abrir uno.
          </li>
        )}
        {threads?.map((t) => (
          <li key={t.id}>
            <Link
              href={`/dashboard/comunidad/${t.id}`}
              className="block rounded-2xl border border-[color:var(--border)] border-l-4 border-l-green-600 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-bold">{t.title}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                por {t.author_alias} · {formatDate(t.created_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
