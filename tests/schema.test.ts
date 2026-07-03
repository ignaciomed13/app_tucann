import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(__dirname, "../supabase/migrations/20260702000000_init_schema.sql"),
  "utf-8"
);

describe("init schema migration", () => {
  it("enables row level security on grows and logs", () => {
    expect(sql).toMatch(/alter table public\.grows enable row level security/);
    expect(sql).toMatch(/alter table public\.logs enable row level security/);
  });

  it("scopes every policy to auth.uid()", () => {
    const policyBlocks = sql.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policyBlocks.length).toBeGreaterThanOrEqual(8);
    for (const block of policyBlocks) {
      expect(block).toContain("auth.uid() = user_id");
    }
  });

  it("defines the five log types", () => {
    for (const type of [
      "environmental",
      "watering",
      "nutrition",
      "observation",
      "transplant",
    ]) {
      expect(sql).toContain(`'${type}'`);
    }
  });

  it("keeps current_pot_volume_l in sync on transplant logs", () => {
    expect(sql).toContain("apply_transplant_volume");
    expect(sql).toContain("new.data->>'new_volume_l'");
  });
});
