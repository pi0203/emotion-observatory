import { requireContent } from "./content";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import type { EmotionSelection } from "./session-types";
import quickOrderKo from "../data/quick-order.ko.json";

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
 * feeling "is", how far apart two words are, or what the user is feeling.
 *
 * State on 2026-11-26 (docs/NORMS.md, 「2026-11-26 대조와 결정」): the bands are
 * still categorical values, and no study value is in this repository. What the
 * Korean studies changed is only the order: five words moved band, and inside a
 * band the Korean words follow the studies' activation ranks
 * (data/quick-order.ko.json, names only). This is still a stopgap and must stay
 * replaceable: see PROJECT_CONTEXT.md, Decision B.
 */
const BAND_CENTRE = { negative: 1 / 6, neutral: 0.5, positive: 5 / 6, low: 1 / 6, medium: 0.5, high: 5 / 6 } as const;
const BAND_REACH = 0.5;

const bandWeight = (position: number, band: keyof typeof BAND_CENTRE) =>
  Math.max(0, 1 - Math.abs(position - BAND_CENTRE[band]) / BAND_REACH);

/**
 * The order inside a band, by name only, and the side a few context-dependent
 * words lean to in the studies. Korean only; any other language keeps the order
 * of its data file.
 */
type QuickOrder = { order: Record<string, readonly string[]>; leanSide: Record<string, string> };
const QUICK_ORDER: Partial<Record<Locale, QuickOrder>> = { ko: quickOrderKo };
const UNRANKED = Number.MAX_SAFE_INTEGER;

/**
 * A word flagged `contextDependent` is offered from either side, because its
 * valence depends on the situation and the app should not fix it to one. Where
 * the studies put it clearly on one side (`leanSide`), on the other side it comes
 * after that side's own words of the same band.
 *
 * Order within a side: band weight, then that lean, then the study order of the
 * band, then the data file. A word the study order does not list comes after the
 * listed words of its band, in data file order.
 */
const rankWithin = (items: VocabularyItem[], valence: string, y: number, quickOrder?: QuickOrder) =>
  items
    .map((item, index) => {
      const lean = quickOrder?.leanSide[item.label];
      const rank = quickOrder?.order[item.activation]?.indexOf(item.label) ?? -1;
      return {
        item,
        index,
        fit: bandWeight(y, item.activation as keyof typeof BAND_CENTRE),
        away: item.contextDependent && lean !== undefined && lean !== valence ? 1 : 0,
        rank: rank < 0 ? UNRANKED : rank,
      };
    })
    .filter((entry) => entry.item.valence === valence || entry.item.contextDependent)
    .sort((a, b) => b.fit - a.fit || a.away - b.away || a.rank - b.rank || a.index - b.index)
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
  const ranked = { negative: rankWithin(items, "negative", y, QUICK_ORDER[locale]), positive: rankWithin(items, "positive", y, QUICK_ORDER[locale]) };
  // A word offered from both sides is shown once: the unpleasant side is filled
  // first, and the pleasant side skips what it already took.
  const pleasantAfter = (taken: number) => {
    const chosen = new Set(ranked.negative.slice(0, taken));
    return ranked.positive.filter((item) => !chosen.has(item));
  };
  let unpleasantSlots = Math.min(ranked.negative.length, Math.round(limit * unpleasantShare));
  let pleasantRanked = pleasantAfter(unpleasantSlots);
  let pleasantSlots = Math.min(pleasantRanked.length, limit - unpleasantSlots);
  // whichever side runs out lends its slots to the other
  unpleasantSlots = Math.min(ranked.negative.length, unpleasantSlots + (limit - unpleasantSlots - pleasantSlots));
  pleasantRanked = pleasantAfter(unpleasantSlots);
  pleasantSlots = Math.min(pleasantRanked.length, limit - unpleasantSlots);

  const left = ranked.negative.slice(0, unpleasantSlots);
  const right = pleasantRanked.slice(0, pleasantSlots);
  const picked = [...left, ...right];
  // alternate so neither side is simply listed first
  const mixed: VocabularyItem[] = [];
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
