"use client";

import { useEffect, useState } from "react";
import { useT } from "../lib/i18n/react";
import {
  baseLayer, canvasOf, FIGURE_BODIES, FIGURE_MODES, FIGURE_STYLES, FIGURE_VISIBILITIES, loadFigurePrefs, organLayers, REGIONS_OUTSIDE_FIGURE,
  regionIndexOf, saveFigurePrefs, zoneBox, zonesOf, type FigurePrefs,
} from "../lib/body-figure";

/**
 * The figure of the body step. Pressing a part names a region; the screen
 * then lists that region's sensations. Nothing here reads a feeling off the
 * body: a region is a place, not a meaning. The accent colour marks only the
 * pressed region, and every part is a real button so the keyboard and a
 * screen reader reach it by the region's name.
 */

/** The saved choice is read after mounting, so the server and the first client render agree. */
export const useFigurePrefs = (): [FigurePrefs, (next: FigurePrefs) => void] => {
  const [prefs, setPrefs] = useState<FigurePrefs>(() => loadFigurePrefs());
  useEffect(() => { setPrefs(loadFigurePrefs()); }, []);
  const update = (next: FigurePrefs) => { setPrefs(next); saveFigurePrefs(next); };
  return [prefs, update];
};

export function BodyFigure({ regions, active, onPick, prefs, onPrefs }: {
  /** The region names of the current language, in the order of data/body-signals.*.json. */
  regions: readonly string[];
  active: string | null;
  onPick: (regionId: string | null) => void;
  prefs: FigurePrefs;
  onPrefs: (next: FigurePrefs) => void;
}) {
  const t = useT();
  const nameOf = (regionId: string) => regions[regionIndexOf(regionId)] ?? regionId;
  const toggle = (regionId: string) => onPick(active === regionId ? null : regionId);
  const canvas = canvasOf(prefs.body);
  const base = baseLayer(prefs);

  return <div className="body-figure-wrap">
    {!prefs.hidden && <p className="body-figure-hint">{t("body.figure.hint")}</p>}
    {!prefs.hidden && <div className="body-figure-row">
      <div className={`body-figure style-${prefs.style}`} role="group" aria-label={t("body.figure.ariaLabel")} style={{ aspectRatio: `${canvas.w} / ${canvas.h}` }}>
        <img className="body-figure-layer" src={base.src} alt="" draggable={false} />
        {organLayers(prefs, active).map((layer) => (
          <img key={layer.organ} className={`body-figure-layer body-figure-organ ${layer.visible ? "visible" : ""}`} src={layer.src} alt="" aria-hidden="true" draggable={false} />
        ))}
        {zonesOf(prefs.body).map((zone, index) => (
          <button
            key={`${zone.region}-${index}`}
            type="button"
            className={`body-zone ${active === zone.region ? "selected" : ""}`}
            style={zoneBox(zone, prefs.body)}
            aria-label={zone.part ? `${nameOf(zone.region)} · ${t(`body.figure.part.${zone.part}`)}` : nameOf(zone.region)}
            aria-pressed={active === zone.region}
            onClick={() => toggle(zone.region)}
          />
        ))}
      </div>
      {/* regions with no place on the figure (energy, movement): buttons under one small title */}
      <div className="body-figure-aside" role="group" aria-label={t("body.figure.wholeBody")}>
        <p className="tier-label body-whole-title">{t("body.figure.wholeBody")}</p>
        {REGIONS_OUTSIDE_FIGURE.map((regionId) => (
          <button key={regionId} type="button" className={`small-button body-whole ${active === regionId ? "selected" : ""}`} aria-pressed={active === regionId} onClick={() => toggle(regionId)}>
            {nameOf(regionId)}
          </button>
        ))}
      </div>
    </div>}
    {!prefs.hidden && <p className="body-figure-credit">{t("body.figure.credit")}</p>}
    <details className="body-figure-settings">
      <summary>{t("body.figure.settings")}</summary>
      <FigureChoice label={t("body.figure.visibleLabel")} options={FIGURE_VISIBILITIES} value={prefs.hidden ? "hidden" : "shown"} name={(value) => t(`body.figure.visible.${value}`)} onChange={(visibility) => onPrefs({ ...prefs, hidden: visibility === "hidden" })} />
      <FigureChoice label={t("body.figure.bodyLabel")} options={FIGURE_BODIES} value={prefs.body} name={(value) => t(`body.figure.body.${value}`)} onChange={(body) => onPrefs({ ...prefs, body })} />
      <FigureChoice label={t("body.figure.styleLabel")} options={FIGURE_STYLES} value={prefs.style} name={(value) => t(`body.figure.style.${value}`)} onChange={(style) => onPrefs({ ...prefs, style })} />
      <FigureChoice label={t("body.figure.modeLabel")} options={FIGURE_MODES} value={prefs.mode} name={(value) => t(`body.figure.mode.${value}`)} onChange={(mode) => onPrefs({ ...prefs, mode })} />
      <p className="small-note">{t("body.figure.storageNote")}</p>
    </details>
  </div>;
}

function FigureChoice<T extends string>({ label, options, value, name, onChange }: { label: string; options: readonly T[]; value: T; name: (value: T) => string; onChange: (value: T) => void }) {
  return <div className="segmented body-figure-choice" role="group" aria-label={label}>
    <span>{label}</span>
    {options.map((option) => (
      <button key={option} type="button" className={value === option ? "selected" : ""} aria-pressed={value === option} onClick={() => onChange(option)}>{name(option)}</button>
    ))}
  </div>;
}
