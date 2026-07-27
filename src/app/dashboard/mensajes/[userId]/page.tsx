import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { markConversationRead } from "@/lib/messages/actions";
import { MessageComposer } from "@/components/messages/message-composer";
import { E2eGate } from "@/components/messages/e2e-gate";
import { ConversationView } from "@/components/messages/conversation-view";
import { DeleteConversationButton } from "@/components/messages/delete-buttons";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // La clave pública del otro: sin ella no se le puede cifrar nada. No es
  // secreta, así que la puede leer cualquier miembro autenticado.
  const { data: otherKey } = await supabase
    .from("user_public_keys")
    .select("public_key")
    .eq("user_id", otherId)
    .maybeSingle();

  // El cuerpo viaja cifrado hasta el browser: acá no hay forma de leerlo.
  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id, sender_id, sender_alias, recipient_alias, ciphertext, iv, created_at")
    // Los dos sentidos de la charla, salteando los que ya borré de mi lado.
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherId},deleted_by_sender_at.is.null),and(sender_id.eq.${otherId},recipient_id.eq.${user.id},deleted_by_recipient_at.is.null)`
    )
    .order("created_at", { ascending: true });

  // El alias del otro: preferimos el que viene de un mensaje real; si es una
  // conversación nueva (sin mensajes), usamos el que llegó del post del foro.
  let otherAlias = aliasFromQuery ?? null;
  const firstFromOther = messages?.find((m) => m.sender_id === otherId);
  if (firstFromOther) otherAlias = firstFromOther.sender_alias;
  else if (messages && messages.length > 0)
    otherAlias = messages[0].recipient_alias;

  // Si borré todos los mensajes visibles y llegué acá sin ?alias, el título
  // quedaría en "Conversación". Buscamos el alias en las filas borradas: RLS
  // igual solo me deja ver charlas donde soy parte. (No sirve leer
  // user_settings del otro: eso lo bloquea RLS, por eso el alias va
  // denormalizado en cada mensaje.)
  if (!otherAlias) {
    const { data: anyMessage } = await supabase
      .from("direct_messages")
      .select("sender_id, sender_alias, recipient_alias")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
      )
      .limit(1)
      .maybeSingle();
    if (anyMessage) {
      otherAlias =
        anyMessage.sender_id === otherId
          ? anyMessage.sender_alias
          : anyMessage.recipient_alias;
    }
  }

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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {otherAlias ?? "Conversación"}
        </h1>
        {messages && messages.length > 0 && (
          <DeleteConversationButton otherId={otherId} />
        )}
      </div>

      <E2eGate userId={user.id}>
        <ConversationView
          messages={messages ?? []}
          otherPublicKey={otherKey?.public_key ?? null}
          myId={user.id}
        />

        {!myAlias ? (
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
        ) : !otherKey ? (
          <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
            <p className="text-sm text-[color:var(--muted)]">
              {otherAlias ?? "Esta persona"} todavía no activó sus mensajes
              cifrados, así que no podría leer lo que le escribas. Probá más
              adelante.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
            <MessageComposer
              recipientId={otherId}
              recipientPublicKey={otherKey.public_key}
            />
          </section>
        )}
      </E2eGate>
    </div>
  );
}
