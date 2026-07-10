"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signup } from "@/lib/auth/actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <Image
          src="/tucu.png"
          alt="Tucu, la mascota de TuCann"
          width={445}
          height={800}
          priority
          className="mx-auto h-44 w-auto drop-shadow-sm"
        />
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">TuCann</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Tu journal de cultivo
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-md">
        <h2 className="text-xl font-bold">Crear cuenta</h2>

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
            placeholder="Contraseña (mínimo 8 caracteres)"
            required
            minLength={8}
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
            {pending ? "Creando cuenta…" : "Registrarme"}
          </button>
        </form>

        <p className="text-sm text-[color:var(--muted)]">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-bold text-green-700 underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
