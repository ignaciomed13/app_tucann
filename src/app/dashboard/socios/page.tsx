import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import {
  PARTNER_CATEGORY_LABELS,
  SUBMISSION_STATUS_LABELS,
} from "@/lib/partners/submissions";
import { SuggestPartnerForm } from "@/components/socios/suggest-partner-form";
import { Hero } from "@/components/ui/hero";
import type { PartnerSubmissionStatus } from "@/lib/supabase/database.types";

const STATUS_STYLES: Record<PartnerSubmissionStatus, string> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  approved: "bg-green-100 text-green-800 ring-green-200",
  rejected: "bg-red-100 text-red-700 ring-red-200",
};

export default async function SociosPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = isAdmin(user.id);

  // Tolerante a la migración pendiente: si la tabla no existe todavía,
  // data es null y se muestra el estado vacío.
  const [{ data: partners }, { data: submissions }, pendingCountRes] =
    await Promise.all([
      supabase
        .from("partners")
        .select("id, name, category, description, city, province, url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("partner_submissions")
        .select("id, name, category, status, review_note, created_at")
        .order("created_at", { ascending: false }),
      admin
        ? supabase
            .from("partner_submissions")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
        : Promise.resolve({ count: 0 }),
    ]);
  const pendingCount = pendingCountRes.count ?? 0;

  return (
    <div className="flex flex-col gap-3.5">
      <Hero
        back={{ href: "/dashboard", label: "← Volver" }}
        title="🤝 Socios"
        subtitle="Comercios amigos — TuCann no vende ni intermedia, el contacto es directo con cada uno."
      />

      {admin && (
        <Link
          href="/dashboard/socios/revision"
          className="self-start rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
        >
          Revisar sugerencias
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">
              {pendingCount}
            </span>
          )}
        </Link>
      )}

      {(!partners || partners.length === 0) && (
        <div className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center">
          <p className="font-medium text-[color:var(--muted)]">
            Todavía no hay socios publicados. Pronto vas a encontrar acá
            growshops y viveros amigos.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3.5">
        {partners?.map((p) => {
          const location = [p.city, p.province].filter(Boolean).join(", ");
          return (
            <li
              key={p.id}
              className="rounded-2xl border border-[color:var(--border)] border-l-4 border-l-green-700 bg-white px-4 py-3.5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-extrabold">{p.name}</h2>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
                  {PARTNER_CATEGORY_LABELS[p.category] ?? p.category}
                </span>
              </div>
              {location && (
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  📍 {location}
                </p>
              )}
              {p.description && (
                <p className="mt-1.5 text-[13px] text-[color:var(--ink)]">
                  {p.description}
                </p>
              )}
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mt-2 inline-block text-xs font-bold text-green-700 hover:underline"
                >
                  Visitar sitio ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <SuggestPartnerForm />

      {submissions && submissions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[color:var(--brand-strong)]">
            Tus sugerencias
          </h2>
          <ul className="flex flex-col gap-2">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-3 shadow-sm"
              >
                <div>
                  <span className="text-[13px] font-bold">{s.name}</span>{" "}
                  <span className="text-xs text-[color:var(--muted)]">
                    · {PARTNER_CATEGORY_LABELS[s.category] ?? s.category}
                  </span>
                  {s.status === "rejected" && s.review_note && (
                    <p className="mt-0.5 text-xs text-red-600">
                      Motivo: {s.review_note}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${STATUS_STYLES[s.status]}`}
                >
                  {SUBMISSION_STATUS_LABELS[s.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
