import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/ui/hero";
import { E2eGate } from "@/components/messages/e2e-gate";
import {
  ConversationList,
  type ConversationPreview,
} from "@/components/messages/conversation-list";

type Dm = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_alias: string;
  recipient_alias: string;
  ciphertext: string;
  iv: string;
  read_at: string | null;
  created_at: string;
};

export default async function MensajesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("direct_messages")
    .select(
      "id, sender_id, recipient_id, sender_alias, recipient_alias, ciphertext, iv, read_at, created_at"
    )
    // Cada parte borra su propia copia de la fila: acá pedimos las que siguen
    // vivas para mí, sea como remitente o como receptor.
    .or(
      `and(sender_id.eq.${user.id},deleted_by_sender_at.is.null),and(recipient_id.eq.${user.id},deleted_by_recipient_at.is.null)`
    )
    .order("created_at", { ascending: false });

  // Agrupamos por "el otro" usuario: el más reciente ya viene primero, así que
  // la primera vez que vemos a alguien es su último mensaje.
  const byOther = new Map<string, ConversationPreview>();
  for (const m of (messages ?? []) as Dm[]) {
    const iAmSender = m.sender_id === user.id;
    const otherId = iAmSender ? m.recipient_id : m.sender_id;
    const otherAlias = iAmSender ? m.recipient_alias : m.sender_alias;

    let conv = byOther.get(otherId);
    if (!conv) {
      conv = {
        otherId,
        otherAlias,
        otherPublicKey: null,
        lastCiphertext: m.ciphertext,
        lastIv: m.iv,
        lastAt: m.created_at,
        unread: 0,
      };
      byOther.set(otherId, conv);
    }
    if (!iAmSender && m.read_at === null) conv.unread += 1;
  }

  // Las claves públicas de todos los interlocutores en una sola consulta: el
  // browser las necesita para descifrar cada preview.
  const otherIds = [...byOther.keys()];
  if (otherIds.length > 0) {
    const { data: keys } = await supabase
      .from("user_public_keys")
      .select("user_id, public_key")
      .in("user_id", otherIds);
    for (const k of keys ?? []) {
      const conv = byOther.get(k.user_id);
      if (conv) conv.otherPublicKey = k.public_key;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Hero
        back={{ href: "/dashboard/comunidad", label: "Comunidad →" }}
        title="✉️ Mensajes"
        chip={
          <p className="text-xs font-semibold leading-relaxed text-lime-100">
            🔒 Cifrados de punta a punta: se descifran en tu dispositivo y no
            los podemos leer. Para escribirle a alguien, tocá ✉️ Mensaje en
            alguno de sus posts.
          </p>
        }
      />

      <E2eGate userId={user.id}>
        <ConversationList conversations={[...byOther.values()]} />
      </E2eGate>
    </div>
  );
}
