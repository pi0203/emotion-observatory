import { requireContent } from "./content";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import type { EmotionSelection } from "./session-types";

export type QuickPoint = { x: number; y: number };

type VocabularyItem = { label: string; valence: string; activation: string; neighbors?: string[]; contextDependent?: boolean };

/** The offered vocabulary of one language. Korean unless a caller asks otherwise. */
const vocabularyOf = (locale: Locale): VocabularyItem[] => requireContent(locale).emotions.items;

const asSelections = (labels: string[]): EmotionSelection[] =>
  labels.map((label) => ({ label, source: "suggested" as const }));

/**
 * PROVISIONAL — boundary blending.
 *
 * The pad records a continuous position, but the vocabulary only carries
 * categorical bands (negative/neutral/positive, low/medium/high). Rather than
 * cutting the axis at hard thresholds, which made every tap inside a cell
 * produce an identical result, each band is given a weight that falls off with
 * distance from the centre of that band. Bands overlap, so a tap near an edge
 * draws from both sides and the candidate list changes as the finger moves.
 *
 * These centres describe the bands, not the words. Nothing here asserts where a
 * feeling "is", how far apart two words are, or what the user is feeling. It is
 * a stopgap until empirical Korean valence/arousal norms are connected, and it
 * must stay replaceable: see PROJECT_CONTEXT.md, Decision B.
 */
const BAND_CENTRE = { negative: 1 / 6, neutral: 0.5, positive: 5 / 6, low: 1 / 6, medium: 0.5, high: 5 / 6 } as const;
const BAND_REACH = 0.5;

const bandWeight = (position: number, band: keyof typeof BAND_CENTRE) =>
  Math.max(0, 1 - Math.abs(position - BAND_CENTRE[band]) / BAND_REACH);

/**
 * A word flagged `contextDependent` is offered from either side, because its
 * valence depends on the situation and the app should not fix it to one.
 */
const rankWithin = (items: VocabularyItem[], valence: string, y: number) =>
  items
    .map((item, index) => ({ item, index, fit: bandWeight(y, item.activation as keyof typeof BAND_CENTRE) }))
    .filter((entry) => entry.item.valence === valence || entry.item.contextDependent)
    .sort((a, b) => b.fit - a.fit || a.index - b.index)
    .map((entry) => entry.item);

/**
 * The horizontal position decides how many of the few slots each side gets, and
 * the vertical position orders the words within a side. Moving the finger
 * changes the mix rather than snapping between fixed cells.
 */
export const filterQuickCandidates = (point: QuickPoint, limit = 5, locale: Locale = DEFAULT_LOCALE): EmotionSelection[] => {
  const items = vocabularyOf(locale);
  const x = Math.max(0, Math.min(1, point.x));
  const y = Math.max(0, Math.min(1, point.y));
  const unpleasant = bandWeight(x, "negative");
  const pleasant = bandWeight(x, "positive");
  const total = unpleasant + pleasant;

  const unpleasantShare = total === 0 ? 0.5 : unpleasant / total;
  const ranked = { negative: rankWithin(items, "negative", y), positive: rankWithin(items, "positive", y) };
  let unpleasantSlots = Math.min(ranked.negative.length, Math.round(limit * unpleasantShare));
  let pleasantSlots = Math.min(ranked.positive.length, limit - unpleasantSlots);
  // whichever side runs out lends its slots to the other
  unpleasantSlots = Math.min(ranked.negative.length, unpleasantSlots + (limit - unpleasantSlots - pleasantSlots));
  pleasantSlots = Math.min(ranked.positive.length, limit - unpleasantSlots);

  const picked = [...ranked.negative.slice(0, unpleasantSlots), ...ranked.positive.slice(0, pleasantSlots)];
  // alternate so neither side is simply listed first
  const mixed: VocabularyItem[] = [];
  const left = ranked.negative.slice(0, unpleasantSlots);
  const right = ranked.positive.slice(0, pleasantSlots);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (unpleasantShare >= 0.5) {
      if (left[index]) mixed.push(left[index]);
      if (right[index]) mixed.push(right[index]);
    } else {
      if (right[index]) mixed.push(right[index]);
      if (left[index]) mixed.push(left[index]);
    }
  }
  return asSelections((mixed.length ? mixed : picked).map((item) => item.label));
};

/**
 * The second tier of the candidate screen: words related to what is already on
 * screen. `neighbors` records which words are worth comparing, not which are
 * psychologically closer, and the user can always step outside the list.
 */
export const expandCandidates = (shown: EmotionSelection[], limit = 6, locale: Locale = DEFAULT_LOCALE): EmotionSelection[] => {
  const items = vocabularyOf(locale);
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

/**
 * Where on the quick pad the second step opens with one plain line, 지금은 여기까지만
 * 남겨도 됩니다 (owner's decision 2026-10-30, second round B): the unpleasant,
 * high-energy corner. Strict on both edges. It is not a risk check: the spot is the
 * person's own tap, nothing about it is stored or said back, the line names no
 * state, and every button on the step stays as it is.
 */
export const PAUSE_LINE_CORNER = { valenceBelow: 0.35, activationAbove: 0.65 } as const;

export const showsPauseLine = (affect?: { valence?: number; activation?: number; unknown?: boolean }) =>
  Boolean(affect && !affect.unknown && affect.valence !== undefined && affect.activation !== undefined
    && affect.valence < PAUSE_LINE_CORNER.valenceBelow && affect.activation > PAUSE_LINE_CORNER.activationAbove);
