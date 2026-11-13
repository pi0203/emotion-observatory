// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Keyboard focus (2026-11-13): the fold titles (summary) and the quick-check
 * affect grid wear the same 2px --accent-ink ring as every button and link,
 * and that ring stays at 3:1 or more on every ground it can sit on.
 */
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

const block = (start: number) => css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
const tokensOf = (source: string) =>
  Object.fromEntries([...source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((match) => [match[1], match[2]]));
const light = tokensOf(block(css.indexOf(":root")));
const pick = (name: string) => ({ ...light, ...tokensOf(block(css.indexOf(`:root[data-ground-pick="${name}"]`))) });
const themes = {
  "light, blue": light,
  "light, sage": pick("sage"),
  "light, blush": pick("blush"),
  "light, lilac": pick("lilac"),
  dark: tokensOf(block(css.indexOf(":root", css.indexOf("@media (prefers-color-scheme: dark)")))),
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const ringRule = () => {
  const at = css.indexOf(":focus-visible");
  const start = css.lastIndexOf("}", at) + 1;
  return { selector: css.slice(start, css.indexOf("{", at)).trim(), body: block(at) };
};

describe("the shared focus ring", () => {
  it("covers fold titles and the affect grid as well as buttons and links", () => {
    const { selector, body } = ringRule();
    const parts = selector.split(",").map((part) => part.trim());
    for (const wanted of ["button:focus-visible", "a:focus-visible", "summary:focus-visible", ".affect-grid:focus-visible"]) {
      expect(parts, wanted).toContain(wanted);
    }
    expect(body).toMatch(/outline: 2px solid var\(--accent-ink\)/);
    expect(body).toMatch(/outline-offset: 2px/);
  });

  it("leaves the affect grid its own rounded shape", () => {
    const squared = [...css.matchAll(/([^{}]*:focus-visible[^{}]*)\{[^}]*border-radius/g)].map((m) => m[1]);
    for (const selector of squared) expect(selector).not.toMatch(/affect-grid/);
  });

  it("keeps questions the code focuses (tabindex -1) without a ring", () => {
    expect(css).toMatch(/\.synthesis-question\[tabindex="-1"\] \{ outline: none; \}/);
  });
});

const GROUNDS = ["paper", "card", "warm",
  ...["blue", "lilac", "mint", "peach", "butter", "mist"].flatMap((tone) => [`tone-${tone}-paper`, `tone-${tone}-card`])];

describe.each(Object.entries(themes))("%s", (_name, tokens) => {
  it.each(GROUNDS)("--accent-ink ring on %s reaches 3:1", (ground) => {
    expect(tokens["accent-ink"], "accent-ink").toBeDefined();
    expect(tokens[ground], ground).toBeDefined();
    expect(ratio(tokens["accent-ink"], tokens[ground])).toBeGreaterThanOrEqual(3);
  });
});
