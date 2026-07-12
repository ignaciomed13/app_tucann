import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { markConversationRead } from "@/lib/messages/actions";
import { MessageComposer } from "@/components/messages/message-composer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ alias?: string }>;
}) {
  const { userId: otherId } = await params;
  if (!UUID_RE.test(otherId)) notFound();

  const { alias: aliasFromQuery } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  // Alias propio: hace falta para poder enviar. Si no tenés, te mandamos a
  // elegirlo a la comunidad.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("forum_alias")
    .eq("user_id", user.id)
    .maybeSingle();
  const myAlias = settings?.forum_alias ?? null;

  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id, sender_id, sender_alias, recipient_alias, body, created_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  // El alias del otro: preferimos el que viene de un mensaje real; si es una
  // conversación nueva (sin mensajes), usamos el que llegó del post del foro.
  let otherAlias = aliasFromQuery ?? null;
  const firstFromOther = messages?.find((m) => m.sender_id === otherId);
  if (firstFromOther) otherAlias = firstFromOther.sender_alias;
  else if (messages && messages.length > 0)
    otherAlias = messages[0].recipient_alias;

  // Marcamos leídos los recibidos de esta persona (idempotente).
  if (messages && messages.some((m) => m.sender_id === otherId)) {
    await markConversationRead(otherId);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/mensajes"
        className="text-sm font-bold text-green-800 hover:underline"
      >
        ← Mensajes
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">
        {otherAlias ?? "Conversación"}
      </h1>

      <div className="flex flex-col gap-3">
        {(!messages || messages.length === 0) && (
          <p className="rounded-2xl border border-[color:var(--border)] bg-white p-5 text-sm text-[color:var(--muted)]">
            Todavía no hay mensajes. Escribí el primero.
          </p>
        )}
        {messages?.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  mine
                    ? "bg-green-700 text-white"
                    : "border border-[color:var(--border)] bg-white text-[color:var(--ink)]"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={`mt-1 text-[11px] ${
                    mine ? "text-green-100" : "text-[color:var(--muted)]"
                  }`}
                >
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {myAlias ? (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
          <MessageComposer recipientId={otherId} />
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
          <p className="text-sm text-[color:var(--muted)]">
            Para enviar mensajes necesitás un alias.{" "}
            <Link
              href="/dashboard/comunidad"
              className="font-bold text-green-700 underline"
            >
              Elegí el tuyo en la comunidad
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
