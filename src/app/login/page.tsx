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
          className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          className="rounded-lg border border-[color:var(--border)] px-3 py-2.5"
        />
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {state.error}
          </p>
        )}
        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-green-700 px-4 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
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
      <div className="text-center">
        <p className="text-5xl">🌱</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">TuCann</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Tu journal de cultivo
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-md">
        <h2 className="text-xl font-bold">Iniciar sesión</h2>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-sm text-[color:var(--muted)]">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-bold text-green-700 underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
