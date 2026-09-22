import emotions from "../data/emotions.ko.json";
import type { EmotionSelection } from "./session-types";

export type QuickPoint = { x: number; y: number };

type VocabularyItem = { label: string; neighbors?: string[] };

const items: VocabularyItem[] = emotions.items;

const asSelections = (labels: string[]): EmotionSelection[] =>
  labels.map((label) => ({ label, source: "suggested" as const }));

// This is navigation metadata for a provisional UX fixture, not an emotion model.
export const filterQuickCandidates = (point: QuickPoint): EmotionSelection[] => {
  const valence = point.x < 0.42 ? "negative" : point.x > 0.58 ? "positive" : "neutral";
  const activation = point.y < 0.42 ? "low" : point.y > 0.58 ? "high" : "medium";
  const matching = emotions.items.filter((item) => item.valence === valence && item.activation === activation);
  const nearby = emotions.items.filter((item) => item.valence === valence || item.activation === activation);
  const labels = [...matching, ...nearby, ...emotions.items].filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label) === index).slice(0, 5);
  return labels.map((item) => ({ label: item.label, source: "suggested" as const }));
};

/**
 * The second tier of the candidate screen: words related to what is already on
 * screen. `neighbors` records which words are worth comparing, not which are
 * psychologically closer, and the user can always step outside the list.
 */
export const expandCandidates = (shown: EmotionSelection[], limit = 6): EmotionSelection[] => {
  const onScreen = new Set(shown.map((item) => item.label));
  const added: string[] = [];
  for (const label of onScreen) {
    const neighbors = items.find((item) => item.label === label)?.neighbors ?? [];
    for (const neighbor of neighbors) {
      if (!onScreen.has(neighbor) && !added.includes(neighbor)) added.push(neighbor);
    }
  }
  return asSelections(added.slice(0, limit));
};
