import type { PartnerSubmissionStatus } from "@/lib/supabase/database.types";

export const PARTNER_CATEGORIES: { value: string; label: string }[] = [
  { value: "growshop", label: "Growshop" },
  { value: "vivero", label: "Vivero" },
];

export const PARTNER_CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(PARTNER_CATEGORIES.map((c) => [c.value, c.label]));

export const SUBMISSION_STATUS_LABELS: Record<
  PartnerSubmissionStatus,
  string
> = {
  pending: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export interface PartnerSubmissionInput {
  name: string;
  category: string;
  description: string | null;
  city: string | null;
  province: string | null;
  url: string | null;
}

export type ParseResult =
  | { ok: true; data: PartnerSubmissionInput }
  | { ok: false; error: string };

// Acepta solo http(s) y exige un host con punto (evita "http://localhost" o
// entradas basura). Normaliza agregando https:// si el usuario no puso esquema.
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function parsePartnerSubmission(form: {
  get(key: string): FormDataEntryValue | null;
}): ParseResult {
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) {
    return { ok: false, error: "Ingresá el nombre del comercio." };
  }
  if (name.length > 120) {
    return { ok: false, error: "El nombre es muy largo (máx. 120)." };
  }

  const category = String(form.get("category") ?? "").trim();
  if (!PARTNER_CATEGORIES.some((c) => c.value === category)) {
    return { ok: false, error: "Elegí una categoría válida." };
  }

  const description = String(form.get("description") ?? "").trim();
  if (description.length > 400) {
    return { ok: false, error: "La descripción es muy larga (máx. 400)." };
  }

  const city = String(form.get("city") ?? "").trim();
  const province = String(form.get("province") ?? "").trim();
  if (city.length > 80 || province.length > 80) {
    return { ok: false, error: "Ciudad o provincia demasiado largas." };
  }

  const urlRaw = String(form.get("url") ?? "").trim();
  let url: string | null = null;
  if (urlRaw) {
    url = normalizeUrl(urlRaw);
    if (!url) {
      return { ok: false, error: "El sitio web no es una URL válida." };
    }
  }

  return {
    ok: true,
    data: {
      name,
      category,
      description: description || null,
      city: city || null,
      province: province || null,
      url,
    },
  };
}
