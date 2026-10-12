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
  ["ink", "accent-subtle", "hover and step notes"],
  ["muted", "paper", "secondary text and the eyebrow"],
  ["muted", "card", "secondary text on cards"],
  ["muted", "warm", "the provisional note"],
  ["accent-ink", "paper", "accent text: disclosure titles, labels, links"],
  ["accent-ink", "card", "accent text on cards"],
  ["on-accent", "accent", "the main button"],
  ["on-accent", "accent-hover", "the main button on hover"],
  ["on-accent", "accent-press", "the main button pressed"],
  ["on-accent", "accent-soft", "a selected choice"],
  ["check", "accent-soft", "the ✓ on a selected choice"],
  ["ink", "badge", "badge text"],
  ["site-ink", "paper", "the homepage frame: logo and footer links"],
  ["site-muted", "paper", "the homepage frame: menu and footer text"],
  ["site-hover", "paper", "the homepage frame: a hovered link"],
];

const EDGES: [string, string, string][] = [
  ["accent-ink", "paper", "focus ring"],
  ["accent-ink", "card", "focus ring on cards"],
  ["accent-soft", "paper", "a selected choice against the page"],
  ["accent-soft", "card", "a selected choice against a card"],
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

const upper = (tokens: Record<string, string>) => Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v.toUpperCase()]));

describe("settled values (owner's choices, 2026-10-12)", () => {
  it("uses the light blue palette with a coral point, exactly as settled", () => {
    expect(upper(themes.light)).toMatchObject({
      paper: "#E0E8FF", card: "#F5F8FF", accent: "#2543D1", "on-accent": "#FFFFFF", ink: "#111A3D",
      muted: "#3F4B7A", line: "#B5C5F5", "pick-underline": "#FF7A52",
    });
    expect(upper(themes.dark)).toMatchObject({
      paper: "#0F1633", card: "#192250", accent: "#8CA2FF", "on-accent": "#0F1633", ink: "#EEF1FF",
      muted: "#A9B4E6", line: "#2E3B7A", "pick-underline": "#FF8A66",
    });
    expect(css).not.toMatch(/#FFFDF6|#2C3A33/i);
  });

  it("fills a selected choice with the blue and writes its text in --on-accent", () => {
    for (const selector of [".chip.selected", ".choice-list button.selected", ".segmented button.selected", ".quick-option-row .secondary-button.selected"]) {
      const at = css.indexOf(selector);
      const body = css.slice(css.indexOf("{", at), css.indexOf("}", at));
      expect(body, selector).toMatch(/background: var\(--accent-soft\)/);
      expect(body, selector).toMatch(/color: var\(--on-accent\)/);
      expect(body, selector).toMatch(/0 3px 0 var\(--pick-underline\)/);
    }
  });

  it("uses coral in one place only: the line under a selected choice", () => {
    expect(themes.light.dot).toBeUndefined();
    expect(themes.dark.dot).toBeUndefined();
    expect(css).not.toMatch(/var\(--dot\)|::before[^{]*\{[^}]*border-radius: 50%/);
    // the coral values appear only as --pick-underline, once per theme
    const coral = [themes.light["pick-underline"], themes.dark["pick-underline"]];
    for (const hex of new Set(coral)) {
      const defined = [...css.matchAll(new RegExp(`--([\\w-]+):\\s*${hex}`, "gi"))].map((m) => m[1]);
      expect(new Set(defined)).toEqual(new Set(["pick-underline"]));
    }
    // and that token is used only as the 3px line under the four selected styles
    const uses = [...css.matchAll(/([^{}]*)\{[^}]*var\(--pick-underline\)/g)].map((m) => m[1].trim());
    expect(uses).toHaveLength(4);
    for (const selector of uses) expect(selector).toMatch(/\.selected$/);
    expect(css.match(/var\(--pick-underline\)/g)).toHaveLength(4);
    expect(css.match(/0 3px 0 var\(--pick-underline\)/g)).toHaveLength(4);
  });

  it("keeps the basis band neutral: card fill, light border, muted text, no blue or coral", () => {
    const at = css.indexOf(".step-basis {");
    expect(at).toBeGreaterThan(0);
    const body = css.slice(css.indexOf("{", at), css.indexOf("}", at));
    expect(body).toMatch(/background: var\(--card\)/);
    expect(body).toMatch(/border: 1px solid var\(--line\)/);
    expect(body).toMatch(/color: var\(--muted\)/);
    expect(body).not.toMatch(/--accent|--pick-underline|--on-accent|--check/);
  });

  it("keeps the homepage's own frame colours, in light and in dark", () => {
    expect(upper(themes.light)).toMatchObject({ "site-ink": "#1E271F", "site-muted": "#46513F", "site-line": "#B2C4AC", "site-hover": "#984024" });
    expect(upper(themes.dark)).toMatchObject({ "site-ink": "#E8EEF5", "site-muted": "#98A5B6", "site-line": "#2A3441", "site-hover": "#FF8A63" });
    const frame = css.slice(css.indexOf(".site-header {"), css.indexOf(".skip-link {"));
    expect(frame).not.toMatch(/var\(--(ink|muted|line|line-strong|accent-ink)\)/);
  });

  it("draws the dark pad's centre lines at 3:1 or more against the whole pad", () => {
    expect(ratio(themes.dark.axis, themes.dark.card)).toBeGreaterThanOrEqual(3);
    expect(ratio(themes.dark.axis, themes.dark.paper)).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.affect-grid::before, \.affect-grid::after \{[^}]*background: var\(--axis\)/);
  });

  it("keeps the light pad's centre lines as they were", () => {
    expect(themes.light.axis.toUpperCase()).toBe(themes.light.line.toUpperCase());
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
