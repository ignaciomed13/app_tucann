"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/lib/auth/actions";

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const justSignedUp = searchParams.get("check_email") === "1";

  return (
    <>
      {justSignedUp && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">
          Revisá tu email para confirmar la cuenta antes de ingresar.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          className="rounded border border-neutral-300 px-3 py-2"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          type="submit"
          className="rounded bg-green-700 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="text-sm text-neutral-600">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="underline">
          Registrate
        </Link>
      </p>
    </main>
  );
}
