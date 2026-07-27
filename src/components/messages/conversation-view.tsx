"use client";

import { useEffect, useState } from "react";
import { deriveConversationKey, decryptMessage } from "@/lib/crypto/e2e";
import { useMyPrivateKey } from "@/components/messages/e2e-gate";
import { DeleteMessageButton } from "@/components/messages/delete-buttons";

export type EncryptedMessage = {
  id: string;
  sender_id: string;
  ciphertext: string;
  iv: string;
  created_at: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// El servidor manda los mensajes cifrados; el texto aparece recién acá, en el
// browser. La clave de la conversación es la misma para los dos lados, así que
// sirve tanto para lo recibido como para lo que mandó uno mismo.
export function ConversationView({
  messages,
  otherPublicKey,
  myId,
}: {
  messages: EncryptedMessage[];
  otherPublicKey: string | null;
  myId: string;
}) {
  const privateKey = useMyPrivateKey();
  const [texts, setTexts] = useState<Map<string, string> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!otherPublicKey || messages.length === 0) {
        if (!cancelled) setTexts(new Map());
        return;
      }
      try {
        const key = await deriveConversationKey(privateKey, otherPublicKey);
        const entries = await Promise.all(
          messages.map(async (m) => {
            try {
              return [m.id, await decryptMessage(m.ciphertext, m.iv, key)] as const;
            } catch {
              // Un mensaje suelto ilegible no puede tumbar toda la pantalla.
              return [m.id, "⚠️ No se pudo descifrar este mensaje."] as const;
            }
          })
        );
        if (!cancelled) setTexts(new Map(entries));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, otherPublicKey, privateKey]);

  if (failed) {
    return (
      <p className="rounded-2xl border border-[color:var(--border)] bg-white p-5 text-sm text-red-700">
        No pudimos descifrar esta conversación con tu clave.
      </p>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="rounded-2xl border border-[color:var(--border)] bg-white p-5 text-sm text-[color:var(--muted)]">
        Todavía no hay mensajes. Escribí el primero.
      </p>
    );
  }

  if (!texts) {
    return (
      <p className="rounded-2xl border border-[color:var(--border)] bg-white p-5 text-sm text-[color:var(--muted)]">
        Descifrando…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => {
        const mine = m.sender_id === myId;
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
              <p className="whitespace-pre-wrap">{texts.get(m.id)}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p
                  className={`text-[11px] ${
                    mine ? "text-green-100" : "text-[color:var(--muted)]"
                  }`}
                >
                  {formatDateTime(m.created_at)}
                </p>
                <DeleteMessageButton messageId={m.id} mine={mine} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
