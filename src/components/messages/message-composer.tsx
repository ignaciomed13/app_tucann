"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/messages/actions";
import { deriveConversationKey, encryptMessage } from "@/lib/crypto/e2e";
import { useMyPrivateKey } from "@/components/messages/e2e-gate";

const MAX_LENGTH = 4000;

// El texto se cifra acá y nunca sale en claro de esta función: a la server
// action solo le llega el resultado cifrado. Por eso no se puede usar
// useActionState con el form directo — antes hay que pasar por WebCrypto.
export function MessageComposer({
  recipientId,
  recipientPublicKey,
}: {
  recipientId: string;
  recipientPublicKey: string;
}) {
  const privateKey = useMyPrivateKey();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > MAX_LENGTH) {
      setError(`El mensaje es muy largo (máx. ${MAX_LENGTH}).`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const key = await deriveConversationKey(privateKey, recipientPublicKey);
      const { ciphertext, iv } = await encryptMessage(text, key);

      const formData = new FormData();
      formData.set("recipient_id", recipientId);
      formData.set("ciphertext", ciphertext);
      formData.set("iv", iv);

      const state = await sendMessage(undefined, formData);
      if (state?.error) {
        setError(state.error);
        setPending(false);
        return;
      }
      setBody("");
      setPending(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cifrar el mensaje."
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribí tu mensaje…"
        required
        rows={3}
        maxLength={MAX_LENGTH}
        className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-green-700 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? "Cifrando y enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
