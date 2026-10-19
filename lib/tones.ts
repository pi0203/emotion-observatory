import type { Stage } from "./session-types";

/**
 * Option B (owner's choice, 2026-10-19): each step gets its own quiet paper colour,
 * after the homepage's per-page backgrounds. The tone says nothing about the user's
 * emotion: it follows the step, never the answers, so no colour reads as a verdict.
 */
export type Tone = "landing" | "blue" | "lilac" | "mint" | "peach" | "butter" | "mist";

const BY_STAGE: Record<Stage, Tone> = {
  landing: "landing",
  "quick-affect": "blue",
  "quick-candidates": "lilac",
  "coach-appraisal": "butter",
  "coach-words": "butter",
  "coach-note": "butter",
  "quick-summary": "peach",
  entry: "mist",
  "entry-mini": "mist",
  body: "mint",
  affect: "blue",
  context: "butter",
  meaning: "peach",
  emotion: "lilac",
  outcome: "mist",
  summary: "peach",
  support: "mint",
  stopped: "mist",
};

export const toneOf = (stage: Stage, onRecords = false): Tone =>
  stage === "landing" && onRecords ? "blue" : BY_STAGE[stage];
