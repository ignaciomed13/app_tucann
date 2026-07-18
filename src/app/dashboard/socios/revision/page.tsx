import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { PARTNER_CATEGORY_LABELS } from "@/lib/partners/submissions";
import { approveSubmission, rejectSubmission } from "@/lib/partners/actions";

export default async function RevisionPage() {
  const user = await requireUser();
  // Defensa en profundidad: los non-admin no ven ni la existencia de la página.
  if (!isAdmin(user.id)) notFound();

  // Service role: la moderación lee postulaciones de todos los usuarios.
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("partner_submissions")
    .select("id, name, category, description, city, province, url, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/socios"
          className="text-sm font-medium text-green-700 hover:underline"
        >
          ← Socios
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Revisar sugerencias
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Postulaciones pendientes. Al aprobar, el comercio se publica en el
          directorio de socios.
        </p>
      </div>

      {(!pending || pending.length === 0) && (
        <div className="rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-white/60 px-6 py-10 text-center">
          <p className="font-medium text-[color:var(--muted)]">
            No hay sugerencias pendientes. 🎉
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {pending?.map((s) => {
          const location = [s.city, s.province].filter(Boolean).join(", ");
          return (
            <li
              key={s.id}
              className="rounded-2xl border border-[color:var(--border)] bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{s.name}</h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 ring-1 ring-green-200">
                  {PARTNER_CATEGORY_LABELS[s.category] ?? s.category}
                </span>
                {location && (
                  <span className="text-sm text-[color:var(--muted)]">
                    📍 {location}
                  </span>
                )}
              </div>
              {s.description && (
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {s.description}
                </p>
              )}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-bold text-green-700 underline"
                >
                  {s.url} ↗
                </a>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[color:var(--border)] pt-3">
                <form action={approveSubmission}>
                  <input type="hidden" name="submission_id" value={s.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
                  >
                    Aprobar y publicar
                  </button>
                </form>
                <form action={rejectSubmission} className="flex items-end gap-2">
                  <input type="hidden" name="submission_id" value={s.id} />
                  <label className="flex flex-col gap-1 text-xs font-medium text-[color:var(--muted)]">
                    Motivo (opcional)
                    <input
                      name="review_note"
                      className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-red-400 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
