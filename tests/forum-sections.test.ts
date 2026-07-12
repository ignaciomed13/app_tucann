import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_FORUM_CATEGORY,
  FORUM_CATEGORIES,
  getForumCategory,
  isForumCategorySlug,
} from "@/lib/forum/categories";

const sql = readFileSync(
  join(__dirname, "../supabase/migrations/20260712020000_forum_sections.sql"),
  "utf-8"
);

describe("secciones del foro", () => {
  it("el CHECK de la migración permite exactamente los slugs de la app", () => {
    const match = sql.match(/check \(category in \(([\s\S]*?)\)\)/);
    expect(match).not.toBeNull();
    const sqlSlugs = [...match![1].matchAll(/'([^']+)'/g)]
      .map((m) => m[1])
      .sort();
    const appSlugs = FORUM_CATEGORIES.map((c) => c.slug).sort();
    expect(sqlSlugs).toEqual(appSlugs);
  });

  it("el default de la columna coincide con el de la app", () => {
    expect(sql).toContain(`default '${DEFAULT_FORUM_CATEGORY}'`);
    expect(isForumCategorySlug(DEFAULT_FORUM_CATEGORY)).toBe(true);
  });

  it("no hay slugs ni nombres duplicados", () => {
    const slugs = FORUM_CATEGORIES.map((c) => c.slug);
    const names = FORUM_CATEGORIES.map((c) => c.name.toLowerCase());
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("getForumCategory cae en la sección general ante slugs desconocidos", () => {
    expect(getForumCategory("no-existe").slug).toBe(DEFAULT_FORUM_CATEGORY);
    expect(getForumCategory(null).slug).toBe(DEFAULT_FORUM_CATEGORY);
    expect(getForumCategory(undefined).slug).toBe(DEFAULT_FORUM_CATEGORY);
  });

  it("valida slugs conocidos y rechaza los que no existen", () => {
    expect(isForumCategorySlug("interior")).toBe(true);
    expect(isForumCategorySlug("reprocann")).toBe(true);
    // guerrilla no tiene sección a propósito: posicionamiento 100% REPROCANN.
    expect(isForumCategorySlug("guerrilla")).toBe(false);
  });
});
