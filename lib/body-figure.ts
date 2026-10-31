import figure from "../data/body-figure.json";

/**
 * The body figure beside the body step's list (owner's decision 2026-10-31).
 *
 * A picture added to the list, never in place of it: the list alone reaches
 * every region, and a region carries no emotion and no pleasant/unpleasant
 * value. The three choices below (figure, style, organs) are a per-device
 * preference. They are kept under their own key and never copied into a
 * record, a summary or an export, because the figure choice could be read as a
 * statement about the person (data/body-figure.json `storage`).
 */

export type FigureBody = "female" | "male";
export type FigureStyle = "real" | "flat" | "line";
export type FigureMode = "always" | "tap";
export type FigurePrefs = { body: FigureBody; style: FigureStyle; mode: FigureMode; /** No figure at all: only the list (owner's decision 2026-11-01). */ hidden: boolean };
export type FigureVisibility = "shown" | "hidden";
export const FIGURE_VISIBILITIES: readonly FigureVisibility[] = ["shown", "hidden"];

export const FIGURE_BODIES: readonly FigureBody[] = ["female", "male"];
export const FIGURE_STYLES: readonly FigureStyle[] = ["real", "flat", "line"];
export const FIGURE_MODES: readonly FigureMode[] = ["always", "tap"];

export const DEFAULT_FIGURE_PREFS: FigurePrefs = figure.defaults as FigurePrefs;

/** Its own key, apart from the records (lib/storage.ts), so nothing about the figure travels with them. */
export const FIGURE_PREFS_KEY = "emotion-lab:body-figure:v1";

const isPrefs = (value: unknown): value is Omit<FigurePrefs, "hidden"> & { hidden?: unknown } =>
  typeof value === "object" && value !== null &&
  FIGURE_BODIES.includes((value as FigurePrefs).body) &&
  FIGURE_STYLES.includes((value as FigurePrefs).style) &&
  FIGURE_MODES.includes((value as FigurePrefs).mode);

/** The saved choice, or the defaults when nothing valid is saved or storage is unavailable. */
export const loadFigurePrefs = (): FigurePrefs => {
  if (typeof window === "undefined") return DEFAULT_FIGURE_PREFS;
  try {
    const raw = window.localStorage.getItem(FIGURE_PREFS_KEY);
    if (!raw) return DEFAULT_FIGURE_PREFS;
    const parsed: unknown = JSON.parse(raw);
    // a value saved before `hidden` existed shows the figure, as it did then
    return isPrefs(parsed) ? { body: parsed.body, style: parsed.style, mode: parsed.mode, hidden: parsed.hidden === true } : DEFAULT_FIGURE_PREFS;
  } catch {
    return DEFAULT_FIGURE_PREFS;
  }
};

/** Saves the choice on this device. A refused write (quota, private mode) leaves the screen working. */
export const saveFigurePrefs = (prefs: FigurePrefs): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(FIGURE_PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
};

/** The region ids, in the order of `regions` in data/body-signals.*.json. */
export const REGION_IDS: readonly string[] = figure.regionIds;
export const regionIdAt = (index: number): string => REGION_IDS[index];
export const regionIndexOf = (id: string): number => REGION_IDS.indexOf(id);
/** Regions with no place on the figure: offered as a button beside it. */
export const REGIONS_OUTSIDE_FIGURE: readonly string[] = figure.outsideFigure;

export type OrganLayer = "chest" | "heart" | "belly";
const ORGAN_LAYERS: readonly OrganLayer[] = ["chest", "heart", "belly"];

export const layerSrc = (body: FigureBody, layer: string) => figure.path.replace("{body}", body).replace("{layer}", layer);

export const canvasOf = (body: FigureBody) => figure.canvas[body];

/** The base silhouette of a style. */
export const baseLayer = (prefs: FigurePrefs) => ({ layer: figure.layersByStyle[prefs.style].base, src: layerSrc(prefs.body, figure.layersByStyle[prefs.style].base) });

/**
 * Every organ layer of the style, each with whether it shows now. All of them
 * are rendered so a layer can fade in and out; "always" shows chest and belly,
 * "tap" shows only the layer of the pressed region, if that region has one.
 */
export const organLayers = (prefs: FigurePrefs, activeRegion: string | null): { organ: OrganLayer; src: string; visible: boolean }[] => {
  const shown: readonly string[] = prefs.mode === "always"
    ? figure.visibility.always
    : activeRegion ? (figure.visibility.tap.byRegion as Record<string, string[]>)[activeRegion] ?? [] : [];
  return ORGAN_LAYERS.map((organ) => ({ organ, src: layerSrc(prefs.body, figure.layersByStyle[prefs.style][organ]), visible: shown.includes(organ) }));
};

export type ZonePart = "neck" | "leftShoulder" | "rightShoulder" | "leftHand" | "rightHand";
type ZoneBase = { region: string; /** Tells apart the zones of one region for a screen reader (data/body-figure.json `partsNote`). */ part?: ZonePart };
export type Zone =
  | (ZoneBase & { shape: "rect"; x: number; y: number; w: number; h: number; rx: number })
  | (ZoneBase & { shape: "circle"; cx: number; cy: number; r_over_width: number })
  | (ZoneBase & { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number });

export const zonesOf = (body: FigureBody): Zone[] => figure.zones[body] as Zone[];

/** No zone is drawn smaller than this on screen, whatever the figure's size (owner's decision 2026-11-01). */
export const MIN_ZONE_PX: number = figure.minZonePx;

/**
 * The CSS box of a zone, as percentages of the figure, placed by its centre so
 * the minimum size can grow it evenly in every direction.
 */
export const zoneBox = (zone: Zone, body: FigureBody): { left: string; top: string; width: string; height: string; borderRadius: string } => {
  const { w: W, h: H } = canvasOf(body);
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
  if (zone.shape === "rect") {
    const vertical = (zone.rx * W) / (zone.h * H);
    return { left: pct(zone.x + zone.w / 2), top: pct(zone.y + zone.h / 2), width: pct(zone.w), height: pct(zone.h), borderRadius: `${pct(zone.rx / zone.w)} / ${pct(vertical)}` };
  }
  if (zone.shape === "circle") {
    const rx = zone.r_over_width;
    const ry = (rx * W) / H;
    return { left: pct(zone.cx), top: pct(zone.cy), width: pct(2 * rx), height: pct(2 * ry), borderRadius: "50%" };
  }
  return { left: pct(zone.cx), top: pct(zone.cy), width: pct(2 * zone.rx), height: pct(2 * zone.ry), borderRadius: "50%" };
};

/** The zone's size in pixels when the figure is `figureWidthPx` wide, before the minimum applies. */
export const zonePx = (zone: Zone, body: FigureBody, figureWidthPx: number): { width: number; height: number } => {
  const { w: W, h: H } = canvasOf(body);
  const figureHeightPx = (figureWidthPx * H) / W;
  const box = zoneBox(zone, body);
  return { width: (parseFloat(box.width) / 100) * figureWidthPx, height: (parseFloat(box.height) / 100) * figureHeightPx };
};

/**
 * The outline organ layers are drawn in one blue-grey (measured 2026-11-01:
 * rgb(84, 108, 137)), which is 2.8:1 on the dark card. Dark mode brightens
 * those layers by this factor, which lifts them past 3:1 (app/globals.css).
 */
export const OUTLINE_ORGAN_RGB: readonly [number, number, number] = [84, 108, 137];
export const DARK_OUTLINE_BRIGHTNESS = 1.5;

export const FIGURE_FADE_SECONDS: number = figure.fadeSeconds;
