import emotions from "../data/emotions.ko.json";
import type { EmotionSelection } from "./session-types";

export type QuickPoint = { x: number; y: number };

// This is navigation metadata for a provisional UX fixture, not an emotion model.
export const filterQuickCandidates = (point: QuickPoint): EmotionSelection[] => {
  const valence = point.x < 0.42 ? "negative" : point.x > 0.58 ? "positive" : "neutral";
  const activation = point.y < 0.42 ? "low" : point.y > 0.58 ? "high" : "medium";
  const matching = emotions.items.filter((item) => item.valence === valence && item.activation === activation);
  const nearby = emotions.items.filter((item) => item.valence === valence || item.activation === activation);
  const labels = [...matching, ...nearby, ...emotions.items].filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label) === index).slice(0, 5);
  return labels.map((item) => ({ label: item.label, source: "suggested" as const }));
};
