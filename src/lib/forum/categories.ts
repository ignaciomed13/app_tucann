// Secciones del foro, inspiradas en los foros clásicos de habla hispana
// (CannabisCafe) pero reducidas a la escena argentina. Esta lista es la
// fuente canónica: la migración forum_sections replica los slugs en un CHECK.
// Decisiones: "cultivo con LED" vive dentro de interior (hoy casi todo indoor
// es LED) y guerrilla no tiene sección propia a propósito — la app se
// posiciona 100% REPROCANN y una sección así compromete el gate legal de las
// tiendas de apps.
export const FORUM_CATEGORIES = [
  {
    slug: "interior",
    emoji: "🏠",
    name: "Cultivo interior",
    description: "Carpas, armarios, luces LED, clima y control de olor.",
  },
  {
    slug: "exterior",
    emoji: "☀️",
    name: "Cultivo exterior",
    description: "Balcón, patio, campo y el calendario de la temporada.",
  },
  {
    slug: "geneticas",
    emoji: "🌱",
    name: "Genéticas y germinación",
    description: "Variedades, semillas, autos vs. fotoperiódicas, fenohunting.",
  },
  {
    slug: "plagas",
    emoji: "🐛",
    name: "Plagas y problemas",
    description: "Bichos, hongos, carencias y hojas que se ven raras.",
  },
  {
    slug: "cosecha",
    emoji: "✂️",
    name: "Cosecha, secado y curado",
    description: "Cuándo cortar, secado, frascos y rendimiento.",
  },
  {
    slug: "reprocann",
    emoji: "⚖️",
    name: "REPROCANN y legal",
    description: "Trámites, renovación y derechos del cultivador registrado.",
  },
  {
    slug: "general",
    emoji: "🧉",
    name: "La ronda",
    description: "Presentaciones, charla general y todo lo que no entra arriba.",
  },
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];
export type ForumCategorySlug = ForumCategory["slug"];

export const DEFAULT_FORUM_CATEGORY: ForumCategorySlug = "general";

export function isForumCategorySlug(value: string): value is ForumCategorySlug {
  return FORUM_CATEGORIES.some((c) => c.slug === value);
}

// Siempre devuelve una sección: ante un slug desconocido (o null) cae en
// "La ronda", igual que el default de la columna en la DB.
export function getForumCategory(
  slug: string | null | undefined
): ForumCategory {
  return (
    FORUM_CATEGORIES.find((c) => c.slug === slug) ??
    FORUM_CATEGORIES.find((c) => c.slug === DEFAULT_FORUM_CATEGORY)!
  );
}
