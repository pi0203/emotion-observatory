import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Screen wording carries no em dash (2026-11-10): a comma, a full stop or a
 * colon instead. Docs (docs/, SAFETY.md) and code comments are not screen
 * wording and are not checked here.
 */
describe("no em dash in screen wording", () => {
  const root = process.cwd();
  const files = [
    "lib/i18n/messages.ko.ts",
    "lib/i18n/messages.en.ts",
    ...readdirSync(join(root, "data")).filter((name) => name.endsWith(".json")).map((name) => `data/${name}`),
  ];

  it.each(files)("%s", (file) => {
    const text = readFileSync(join(root, file), "utf8");
    // in the .ts files only the strings are wording; comments may keep theirs
    const wording = file.endsWith(".ts") ? (text.match(/"(?:[^"\\\n]|\\.)*"/g) ?? []).join("\n") : text;
    expect(wording).not.toMatch(/—/);
  });
});
