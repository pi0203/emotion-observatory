// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Type, after the homepage (docs/DESIGN_ALIGNMENT.md §4, owner's alternative 3):
 * Noto Sans KR 400 and Noto Serif KR 400, served by next/font from this
 * site, no English text face, no system or Georgia stacks. One exception
 * (2026-11-13): Instrument Serif 400 for the header wordmark only, the homepage's face.
 */
const fonts = readFileSync(join(__dirname, "../app/fonts.ts"), "utf8");
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const code = fonts.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("fonts", () => {
  it("loads Noto Sans KR, Noto Serif KR and the wordmark's Instrument Serif only, through next/font/google", () => {
    const imported = code.match(/import\s*\{([^}]*)\}\s*from\s*"next\/font\/google"/)?.[1].split(",").map((name) => name.trim()).filter(Boolean);
    expect(imported?.sort()).toEqual(["Instrument_Serif", "Noto_Sans_KR", "Noto_Serif_KR"]);
    expect(code).not.toMatch(/next\/font\/local|fonts\.googleapis|fonts\.gstatic/);
  });

  it("loads no English text face (Newsreader or any other); Instrument Serif is for the wordmark only", () => {
    expect(code).not.toMatch(/Newsreader|Inter\b|Roboto|Source_Serif/);
    expect(code.match(/Instrument_Serif\(\{[^}]*\}\)/g)).toEqual([expect.stringMatching(/weight:\s*"400"[^}]*display:\s*"swap"[^}]*adjustFontFallback:\s*true[^}]*variable:\s*"--font-wordmark"/)]);
    const uses = [...css.matchAll(/([^{}]+)\{[^}]*var\(--font-wordmark\)/g)].map((match) => match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim());
    expect(uses).toEqual([".site-logo-text"]);
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
    // one exception, the homepage frame's wordmark at the homepage's own size (2026-11-10), used once
    for (const size of sizes) expect(size).toMatch(/^var\(--(t-(aside|small|body|lead|scene)|site-wordmark)\)$/);
    expect(sizes.filter((size) => size === "var(--site-wordmark)")).toHaveLength(1);
    expect(css).not.toMatch(/font:\s*(\d{3}\s+)?\d+px/);
  });

  it("sizes the font shorthand with the type scale too, so no em or px size slips under 13px (2026-11-10)", () => {
    const shorthands = [...css.matchAll(/(?:^|[;{\s])font:\s*([^;}]+)/g)].map((match) => match[1].replace(/\s*!important$/, "").trim()).filter((value) => value !== "inherit");
    expect(shorthands.length).toBeGreaterThan(10);
    for (const value of shorthands) expect(value).toMatch(/^(?:(?:italic|\d{3})\s+)?var\(--t-(aside|small|body|lead|scene)\)(?:\/[\d.]+)?\s+var\(--font-(sans|serif)\)/);
  });

  it("draws the English screen's KO mark at the 13px floor, not a fraction of the menu's size (2026-11-10)", () => {
    const rule = css.match(/\.ko-mark \{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/font: 600 var\(--t-aside\)/);
    expect(rule).not.toMatch(/font-size|[\d.]+em\//);
    expect(css).toMatch(/--t-aside: \.8125rem;/);
  });
});
