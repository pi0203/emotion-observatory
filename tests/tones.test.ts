// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toneOf } from "../lib/tones";

/** Option B (owner, 2026-10-19): a paper colour per step that follows the step, never the answers. */
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const app = readFileSync(join(__dirname, "../app/emotion-app.tsx"), "utf8");

describe("tones per step", () => {
  it("gives every tone a rule in the stylesheet", () => {
    const stages = ["landing", "quick-affect", "quick-candidates", "coach-appraisal", "quick-summary", "entry", "body", "affect", "context", "meaning", "emotion", "outcome", "summary", "support", "stopped"] as const;
    for (const stage of stages) {
      const tone = toneOf(stage);
      expect(css).toContain(`:root[data-tone="${tone}"]`);
    }
    expect(toneOf("landing", true)).toBe("blue");
  });

  it("depends on the step only, not on anything the person chose", () => {
    // the tone is computed from the stage and whether the records list is open, nothing else
    expect(app).toMatch(/toneOf\(session\.stage, Boolean\(records \|\| openRecord\)\)/);
    expect(toneOf.length).toBeLessThanOrEqual(2);
  });

  it("keeps the colour change still for people who ask for less motion", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ html, body \{ transition: none; \} \}/);
  });

  it("keeps the landing drawing out of the accessibility tree", () => {
    expect(app).toContain('<div className="hero-pad" aria-hidden="true">');
  });
});
