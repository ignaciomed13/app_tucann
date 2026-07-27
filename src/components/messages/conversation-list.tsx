"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deriveConversationKey, decryptMessage } from "@/lib/crypto/e2e";
import { useMyPrivateKey } from "@/components/messages/e2e-gate";

export type ConversationPreview = {
  otherId: string;
  otherAlias: string;
  otherPublicKey: string | null;
  lastCiphertext: string;
  lastIv: string;
  lastAt: string;
  unread: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

// El preview de cada conversación también está cifrado: hay que descifrar uno
// por conversación para poder mostrar el "último mensaje".
export function ConversationList({
  conversations,
}: {
  conversations: ConversationPreview[];
}) {
  const privateKey = useMyPrivateKey();
  const [previews, setPreviews] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        conversations.map(async (c) => {
          if (!c.otherPublicKey) return [c.otherId, "🔒 Mensaje cifrado"] as const;
          try {
            const key = await deriveConversationKey(privateKey, c.otherPublicKey);
            return [
              c.otherId,
              await decryptMessage(c.lastCiphertext, c.lastIv, key),
            ] as const;
          } catch {
            return [c.otherId, "🔒 Mensaje cifrado"] as const;
          }
        })
      );
      if (!cancelled) setPreviews(new Map(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [conversations, privateKey]);

  if (conversations.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center text-sm font-medium text-[color:var(--muted)]">
        Todavía no tenés conversaciones.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
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
              {previews?.get(c.otherId) ?? "Descifrando…"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
