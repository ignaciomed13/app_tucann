import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AliasForm } from "@/components/forum/alias-form";
import { ReplyForm } from "@/components/forum/reply-form";
import { DmLink } from "@/components/forum/dm-link";
import { EditableThread } from "@/components/forum/editable-thread";
import { EditablePost } from "@/components/forum/editable-post";
import { getForumCategory } from "@/lib/forum/categories";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// El trigger del foro pone created_at y updated_at con el mismo now() en el
// insert (now() es constante dentro de la transacción), así que si difieren es
// porque el mensaje se editó después.
function metaLine(createdAt: string, updatedAt: string) {
  const edited = updatedAt !== createdAt;
  return `${formatDateTime(createdAt)}${edited ? " · editado" : ""}`;
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
    .select(
      "id, title, body, author_id, author_alias, category, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!thread) notFound();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, body, author_id, author_alias, created_at, updated_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("forum_alias")
    .eq("user_id", user.id)
    .maybeSingle();
  const alias = settings?.forum_alias ?? null;

  const replyCount = posts?.length ?? 0;
  const category = getForumCategory(thread.category);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/comunidad"
        className="text-sm font-bold text-green-800 hover:underline"
      >
        ← Comunidad
      </Link>

      <article className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <Link
          href={`/dashboard/comunidad?seccion=${category.slug}`}
          className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 transition hover:bg-green-200"
        >
          {category.emoji} {category.name}
        </Link>
        <EditableThread
          id={thread.id}
          title={thread.title}
          body={thread.body}
          category={thread.category}
          isOwner={thread.author_id === user.id}
        />
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          por {thread.author_alias} ·{" "}
          {metaLine(thread.created_at, thread.updated_at)}
          <DmLink
            authorId={thread.author_id}
            alias={thread.author_alias}
            myId={user.id}
          />
        </p>
      </article>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">
          {replyCount} {replyCount === 1 ? "respuesta" : "respuestas"}
        </h2>
        {posts?.map((p) => (
          <EditablePost
            key={p.id}
            id={p.id}
            threadId={thread.id}
            body={p.body}
            authorId={p.author_id}
            authorAlias={p.author_alias}
            myId={user.id}
            meta={metaLine(p.created_at, p.updated_at)}
            isOwner={p.author_id === user.id}
          />
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
