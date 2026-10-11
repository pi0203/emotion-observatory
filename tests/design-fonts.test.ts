// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Type, after the homepage (docs/DESIGN_ALIGNMENT.md §4, owner's alternative 3):
 * Noto Sans KR 400 and Noto Serif KR 400 only, served by next/font from this
 * site, no English face while English is off, no system or Georgia stacks.
 */
const fonts = readFileSync(join(__dirname, "../app/fonts.ts"), "utf8");
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const code = fonts.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("fonts", () => {
  it("loads Noto Sans KR and Noto Serif KR only, through next/font/google", () => {
    const imported = code.match(/import\s*\{([^}]*)\}\s*from\s*"next\/font\/google"/)?.[1].split(",").map((name) => name.trim()).filter(Boolean);
    expect(imported?.sort()).toEqual(["Noto_Sans_KR", "Noto_Serif_KR"]);
    expect(code).not.toMatch(/next\/font\/local|fonts\.googleapis|fonts\.gstatic/);
  });

  it("loads no English face (Newsreader, Instrument Serif or any other) while English is off", () => {
    expect(code).not.toMatch(/Newsreader|Instrument_Serif|Inter\b|Roboto|Source_Serif/);
  });

  it("loads the regular weight only, with swap and a size-matched fallback", () => {
    for (const call of code.match(/Noto_S(?:ans|erif)_KR\(\{[^}]*\}\)/g) ?? []) {
      expect(call).toMatch(/weight:\s*"400"/);
      expect(call).toMatch(/display:\s*"swap"/);
      expect(call).toMatch(/adjustFontFallback:\s*true/);
    }
    expect((code.match(/Noto_S(?:ans|erif)_KR\(\{/g) ?? []).length).toBe(2);
  });

  it("drops Georgia and system-ui from the app stylesheet", () => {
    expect(css).not.toMatch(/Georgia|system-ui|Times New Roman/);
    expect(css).toMatch(/body \{[^}]*font-family: var\(--font-sans\)/);
    expect(css).toMatch(/h1 \{[^}]*font-family: var\(--font-serif\)/);
  });

  it("sizes text with the five steps of the type scale, never a raw pixel size", () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;}]+)/g)].map((match) => match[1].trim());
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(size).toMatch(/^var\(--t-(aside|small|body|lead|scene)\)$/);
    expect(css).not.toMatch(/font:\s*(\d{3}\s+)?\d+px/);
  });
});
