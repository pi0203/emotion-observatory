/**
 * The visitor's own paper colour (owner, 2026-11-13: "이걸 사용자가 고를 수 있게 하면 어떨까?").
 * Four light sets with the same token names; dark keeps its one set. The pick lives on
 * <html data-ground-pick>, the same way as the homepage's ground toggle, and the CSS in
 * app/globals.css (tokens-light) holds the values. Blue is the default and has no attribute.
 */
export const GROUNDS = ["blue", "sage", "blush", "lilac"] as const;
export type Ground = (typeof GROUNDS)[number];
export const DEFAULT_GROUND: Ground = "blue";
export const GROUND_KEY = "emotion-lab:ground";

export const isGround = (value: unknown): value is Ground => GROUNDS.includes(value as Ground);

/**
 * Runs before the first paint (app/korean-document.tsx, app/(en)/en/layout.tsx), so a visitor
 * who picked a colour never sees the blue flash first on a reload. It is a string, so it
 * repeats the list above instead of importing it.
 */
export const GROUND_INIT = `
try {
  var g = localStorage.getItem(${JSON.stringify(GROUND_KEY)});
  if (${JSON.stringify(GROUNDS.filter((g) => g !== DEFAULT_GROUND))}.indexOf(g) >= 0) document.documentElement.dataset.groundPick = g;
} catch (e) {}
`;

export const readGround = (): Ground => {
  const value = document.documentElement.dataset.groundPick;
  return isGround(value) ? value : DEFAULT_GROUND;
};

/** Sets the attribute and remembers it in this browser. A blocked storage (private mode) keeps it for this visit only. */
export const applyGround = (ground: Ground) => {
  const root = document.documentElement;
  if (ground === DEFAULT_GROUND) delete root.dataset.groundPick;
  else root.dataset.groundPick = ground;
  try {
    if (ground === DEFAULT_GROUND) window.localStorage.removeItem(GROUND_KEY);
    else window.localStorage.setItem(GROUND_KEY, ground);
  } catch {
    // storage refused: the colour stays for this visit
  }
};
