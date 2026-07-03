import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-green-700 to-green-500 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-lg font-extrabold tracking-tight">TuCann</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden opacity-90 sm:inline">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-white/15 px-3 py-1.5 font-medium text-white ring-1 ring-white/30 transition hover:bg-white/25"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
