import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AliasForm } from "@/components/forum/alias-form";
import { ReplyForm } from "@/components/forum/reply-form";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Botón para iniciar un MP con el autor. Solo aparece si no sos vos: nunca hay
// un directorio de usuarios, se escribe desde el post de alguien.
function DmLink({
  authorId,
  alias,
  myId,
}: {
  authorId: string;
  alias: string;
  myId: string;
}) {
  if (authorId === myId) return null;
  return (
    <Link
      href={`/dashboard/mensajes/${authorId}?alias=${encodeURIComponent(alias)}`}
      className="ml-2 rounded-full border border-green-700 px-2 py-0.5 text-[11px] font-bold text-green-800 transition hover:bg-green-50"
    >
      ✉️ Mensaje
    </Link>
  );
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, title, body, author_id, author_alias, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!thread) notFound();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, body, author_id, author_alias, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("forum_alias")
    .eq("user_id", user.id)
    .maybeSingle();
  const alias = settings?.forum_alias ?? null;

  const replyCount = posts?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/comunidad"
        className="text-sm font-bold text-green-800 hover:underline"
      >
        ← Comunidad
      </Link>

      <article className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {thread.title}
        </h1>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          por {thread.author_alias} · {formatDateTime(thread.created_at)}
          <DmLink
            authorId={thread.author_id}
            alias={thread.author_alias}
            myId={user.id}
          />
        </p>
        <p className="mt-4 whitespace-pre-wrap text-[color:var(--ink)]">
          {thread.body}
        </p>
      </article>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          {replyCount} {replyCount === 1 ? "respuesta" : "respuestas"}
        </h2>
        {posts?.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm"
          >
            <p className="text-xs text-[color:var(--muted)]">
              {p.author_alias} · {formatDateTime(p.created_at)}
              <DmLink
                authorId={p.author_id}
                alias={p.author_alias}
                myId={user.id}
              />
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[color:var(--ink)]">
              {p.body}
            </p>
          </div>
        ))}
      </section>

      {alias ? (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Responder</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            como <strong className="text-[color:var(--ink)]">{alias}</strong>
          </p>
          <div className="mt-4">
            <ReplyForm threadId={thread.id} />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Elegí un alias para responder</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            No hace falta que sea tu nombre real.
          </p>
          <div className="mt-4">
            <AliasForm defaultAlias={null} />
          </div>
        </section>
      )}
    </div>
  );
}
