import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/grows/planning";
import { ReprocannForm } from "@/components/account/reprocann-form";
import { DeleteAccount } from "@/components/account/delete-account";
import { Hero } from "@/components/ui/hero";

// Estado del REPROCANN para el chip de la página (espejo de los umbrales de
// recordatorio en notifications/reminders.ts).
function reprocannStatus(expiresOn: string, today: Date) {
  const left = daysUntil(new Date(`${expiresOn}T00:00:00Z`), today);
  if (left < 0) {
    return { label: "Vencido", className: "bg-red-100 text-red-800 ring-red-200" };
  }
  if (left === 0) {
    return { label: "Vence hoy", className: "bg-red-100 text-red-800 ring-red-200" };
  }
  if (left <= 30) {
    return {
      label: `Vence en ${left} día${left === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-800 ring-amber-200",
    };
  }
  return {
    label: `Vigente (${left} días restantes)`,
    className: "bg-green-100 text-green-800 ring-green-200",
  };
}

export default async function CuentaPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // maybeSingle: si la migración de user_settings todavía no corrió, data es
  // null y la página funciona igual (solo sin fecha guardada).
  const { data: settings } = await supabase
    .from("user_settings")
    .select("reprocann_expires_on")
    .eq("user_id", user.id)
    .maybeSingle();

  const expiresOn = settings?.reprocann_expires_on ?? null;
  const status = expiresOn ? reprocannStatus(expiresOn, new Date()) : null;

  return (
    <div className="flex flex-col gap-4">
      <Hero
        back={{ href: "/dashboard", label: "← Volver" }}
        title="Tu cuenta"
        subtitle={user.email}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[15px] font-extrabold">REPROCANN</h2>
          {status && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${status.className}`}
            >
              {status.label}
            </span>
          )}
        </div>
        <ReprocannForm defaultExpiresOn={expiresOn} />
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <h2 className="text-[15px] font-extrabold">Datos de acceso</h2>
        <p className="mt-1 text-[13px] text-[color:var(--muted)]">
          Sesión iniciada como{" "}
          <strong className="text-[color:var(--ink)]">{user.email}</strong>
        </p>
      </section>

      <section className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-red-200 bg-white p-4">
        <h2 className="text-[15px] font-extrabold text-red-600">
          Zona de riesgo
        </h2>
        <p className="text-xs leading-relaxed text-[color:var(--muted)]">
          Borrá tu cuenta y todos tus datos de TuCann. Qué guardamos y cómo lo
          tratamos está explicado en la{" "}
          <Link href="/privacidad" className="font-medium underline">
            política de privacidad
          </Link>
          .
        </p>
        <DeleteAccount />
      </section>
    </div>
  );
}
