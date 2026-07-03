import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const example = readFileSync(
  join(__dirname, "../.env.local.example"),
  "utf-8"
);

describe(".env.local.example", () => {
  it("documents every variable the app reads from process.env", () => {
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "GEMINI_API_KEY",
    ]) {
      expect(example).toContain(key);
    }
  });
});
