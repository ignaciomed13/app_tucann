import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_LABELS: Record<string, string> = {
  growshop: "Growshop",
  vivero: "Vivero",
};

export default async function SociosPage() {
  await requireUser();
  const supabase = await createClient();

  // Tolerante a la migración pendiente: si la tabla no existe todavía,
  // data es null y se muestra el estado vacío.
  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, category, description, city, province, url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Socios</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Comercios amigos de TuCann. Espacio de socios: TuCann no vende ni
          intermedia — el contacto es directo con cada comercio.
        </p>
      </div>

      {(!partners || partners.length === 0) && (
        <div className="rounded-2xl border-2 border-dashed border-green-300 bg-white/60 px-6 py-10 text-center">
          <p className="font-medium text-[color:var(--muted)]">
            Todavía no hay socios publicados. Pronto vas a encontrar acá
            growshops y viveros amigos.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {partners?.map((p) => {
          const location = [p.city, p.province].filter(Boolean).join(", ");
          return (
            <li
              key={p.id}
              className="rounded-2xl border border-[color:var(--border)] border-l-4 border-l-green-600 bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{p.name}</h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 ring-1 ring-green-200">
                  {CATEGORY_LABELS[p.category] ?? p.category}
                </span>
                {location && (
                  <span className="text-sm text-[color:var(--muted)]">
                    📍 {location}
                  </span>
                )}
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {p.description}
                </p>
              )}
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mt-2 inline-block text-sm font-bold text-green-700 underline"
                >
                  Visitar sitio ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
