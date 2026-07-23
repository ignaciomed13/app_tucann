import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/ui/hero";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

type Dm = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_alias: string;
  recipient_alias: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Conversation = {
  otherId: string;
  otherAlias: string;
  lastBody: string;
  lastAt: string;
  unread: number;
};

export default async function MensajesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("direct_messages")
    .select(
      "id, sender_id, recipient_id, sender_alias, recipient_alias, body, read_at, created_at"
    )
    .order("created_at", { ascending: false });

  // Agrupamos por "el otro" usuario: el más reciente ya viene primero, así que
  // la primera vez que vemos a alguien es su último mensaje.
  const byOther = new Map<string, Conversation>();
  for (const m of (messages ?? []) as Dm[]) {
    const iAmSender = m.sender_id === user.id;
    const otherId = iAmSender ? m.recipient_id : m.sender_id;
    const otherAlias = iAmSender ? m.recipient_alias : m.sender_alias;

    let conv = byOther.get(otherId);
    if (!conv) {
      conv = {
        otherId,
        otherAlias,
        lastBody: m.body,
        lastAt: m.created_at,
        unread: 0,
      };
      byOther.set(otherId, conv);
    }
    if (!iAmSender && m.read_at === null) conv.unread += 1;
  }

  const conversations = [...byOther.values()];

  return (
    <div className="flex flex-col gap-4">
      <Hero
        back={{ href: "/dashboard/comunidad", label: "Comunidad →" }}
        title="✉️ Mensajes"
        chip={
          <p className="text-xs font-semibold leading-relaxed text-lime-100">
            🔒 Privados entre miembros del foro. Para escribirle a alguien, tocá
            ✉️ Mensaje en alguno de sus posts.
          </p>
        }
      />

      <ul className="flex flex-col gap-2.5">
        {conversations.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center text-sm font-medium text-[color:var(--muted)]">
            Todavía no tenés conversaciones.
          </li>
        )}
        {conversations.map((c) => (
          <li key={c.otherId}>
            <Link
              href={`/dashboard/mensajes/${c.otherId}`}
              // Acento verde mientras haya sin leer; apagado una vez leídos.
              className={`block rounded-2xl border border-[color:var(--border)] border-l-4 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                c.unread > 0
                  ? "border-l-green-700"
                  : "border-l-[color:var(--border)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-extrabold">{c.otherAlias}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {c.unread > 0 && (
                    <span className="rounded-full bg-green-700 px-2 py-0.5 text-[11px] font-extrabold text-white">
                      {c.unread}
                    </span>
                  )}
                  <span className="text-[11px] text-[color:var(--faint)]">
                    {formatDate(c.lastAt)}
                  </span>
                </div>
              </div>
              <p className="mt-1 truncate text-[13px] text-[color:var(--muted)]">
                {c.lastBody}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
