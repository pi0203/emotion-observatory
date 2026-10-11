// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrast floors for the whole palette, computed from the token values in
 * app/globals.css for both themes (PRODUCT_SPEC §19): text 4.5:1, control
 * edges, the focus ring and the selected edge 3:1. Whoever changes a colour
 * later gets a failing test, not a quiet regression.
 */
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

const block = (start: number) => css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
const lightBlock = block(css.indexOf(":root"));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const darkBlock = block(css.indexOf(":root", darkStart));

const tokensOf = (source: string) =>
  Object.fromEntries([...source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((match) => [match[1], match[2]]));
const themes = { light: tokensOf(lightBlock), dark: tokensOf(darkBlock) };

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** [foreground token, background token, where it is used] */
const TEXT: [string, string, string][] = [
  ["ink", "paper", "body text"],
  ["ink", "card", "text on cards, inputs and choices"],
  ["ink", "warm", "the example zone and asides"],
  ["ink", "accent-soft", "a selected choice"],
  ["ink", "accent-subtle", "hover and step notes"],
  ["muted", "paper", "secondary text and the eyebrow"],
  ["muted", "card", "secondary text on cards"],
  ["muted", "warm", "the provisional note"],
  ["muted", "accent-soft", "secondary text inside a selected row"],
  ["accent-ink", "paper", "accent text: disclosure titles, labels, links"],
  ["accent-ink", "card", "accent text on cards"],
  ["on-accent", "accent", "the main button"],
  ["on-accent", "accent-hover", "the main button on hover"],
  ["on-accent", "accent-press", "the main button pressed"],
  ["check", "accent-soft", "the ✓ and the record depth badge"],
];

const EDGES: [string, string, string][] = [
  ["accent-ink", "paper", "focus ring"],
  ["accent-ink", "card", "focus ring on cards"],
  ["accent-ink", "accent-soft", "selected edge"],
  ["line-strong", "paper", "control borders"],
  ["line-strong", "card", "control borders on cards"],
  ["accent", "paper", "the main button against the page"],
  ["accent", "card", "the affect dot on the pad"],
];

describe.each(Object.entries(themes))("%s theme", (_name, tokens) => {
  it.each(TEXT)("%s on %s reaches 4.5:1 (%s)", (fg, bg) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(EDGES)("%s on %s reaches 3:1 (%s)", (fg, bg) => {
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
});

describe("palette structure", () => {
  it("defines every light colour token again for dark, so dark never falls back to a light value", () => {
    expect(darkStart).toBeGreaterThan(0);
    const light = Object.keys(themes.light).sort();
    expect(light.length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(themes.dark).sort()).toEqual(light);
  });

  it("writes no colour outside the token blocks", () => {
    const outside = css.replace(lightBlock, "").replace(darkBlock, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(outside.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\bwhite\b|\bblack\b/g) ?? []).toEqual([]);
  });

  it("no longer uses the fluorescent green anywhere", () => {
    expect(css).not.toMatch(/#B4FF00/i);
  });

  it("marks a selected choice with an inner ring as well as colour", () => {
    for (const selector of [".chip.selected", ".choice-list button.selected", ".segmented button.selected", ".quick-option-row .secondary-button.selected"]) {
      const at = css.indexOf(selector);
      expect(at, selector).toBeGreaterThan(0);
      const body = css.slice(css.indexOf("{", at), css.indexOf("}", at));
      expect(body, selector).toMatch(/box-shadow: inset 0 0 0 1px var\(--accent-ink\)/);
    }
  });
});
