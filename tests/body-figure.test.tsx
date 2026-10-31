import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import bodySignals from "../data/body-signals.ko.json";
import bodySignalsEn from "../data/body-signals.en.json";
import figure from "../data/body-figure.json";
import { ko } from "../lib/i18n/messages.ko";
import { DEFAULT_FIGURE_PREFS, FIGURE_PREFS_KEY, loadFigurePrefs, organLayers, REGION_IDS, saveFigurePrefs, zoneBox, zonesOf } from "../lib/body-figure";
import { buildExport, serializeExport } from "../lib/record-transfer";
import { getStorageKeys, loadCompleted, loadDraft } from "../lib/storage";
import { startDeep } from "./helpers/start";

/**
 * The body figure (owner's decision 2026-10-31): a picture beside the body
 * list, never in its place. The list alone reaches every region, the figure's
 * choices stay on the device, every part is reachable by keyboard, and the
 * organ fade stops under reduced motion.
 */

const toBody = () => {
  render(<Home />);
  startDeep();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.entry.observe}`) }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.body.title);
};

describe("the list alone reaches every region", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("lists a sensation of all seven regions without touching the figure, and 특별히 모르겠음 is shown from the start", () => {
    toBody();
    expect(screen.getByRole("button", { name: /특별히 모르겠음/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: ko.body.more }));
    const items = bodySignals.items as { label: string; region: string }[];
    for (const region of bodySignals.regions) {
      const labels = items.filter((item) => item.region === region).map((item) => item.label);
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) expect(screen.getByRole("button", { name: new RegExp(`^(✓ )?${label}$`) })).toBeInTheDocument();
    }
  });

  it("maps the figure's zones onto the same seven regions, in both languages", () => {
    expect(REGION_IDS).toHaveLength(bodySignals.regions.length);
    expect(REGION_IDS).toHaveLength(bodySignalsEn.regions.length);
    const covered = new Set([...zonesOf("female"), ...zonesOf("male")].map((zone) => zone.region).concat(figure.outsideFigure));
    for (const id of REGION_IDS) expect(covered.has(id), id).toBe(true);
    // a zone is a place, not a meaning: a zone carries a region and a shape, nothing about what it feels like
    for (const zone of [...zonesOf("female"), ...zonesOf("male")]) {
      expect(Object.keys(zone).sort()).toEqual(expect.not.arrayContaining(["valence", "emotion", "label", "hint"]));
      expect(REGION_IDS).toContain(zone.region);
    }
  });
});

describe("pressing the figure", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("names every part by its region so the keyboard and a screen reader reach it, and the pressed part opens that region's list", () => {
    toBody();
    const group = screen.getByRole("group", { name: ko.body.figure.ariaLabel });
    const zones = within(group).getAllByRole("button");
    expect(zones.length).toBe(zonesOf(DEFAULT_FIGURE_PREFS.body).length);
    for (const zone of zones) {
      expect(zone.tagName).toBe("BUTTON");
      expect(bodySignals.regions).toContain(zone.getAttribute("aria-label"));
      expect(zone.getAttribute("aria-pressed")).toBe("false");
    }
    const belly = within(group).getAllByRole("button", { name: "배·속" })[0];
    belly.focus();
    expect(document.activeElement).toBe(belly);
    fireEvent.click(belly);
    expect(belly.getAttribute("aria-pressed")).toBe("true");
    const panel = screen.getByRole("region", { name: "배·속" });
    for (const label of ["배가 조이는 느낌", "속이 울렁거림", "메스꺼움", "배가 편안함", "속이 따뜻하고 안정됨"]) {
      expect(within(panel).getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
    }
    // only the pressed part is marked
    expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(1);
    fireEvent.click(belly);
    expect(screen.queryByRole("region", { name: "배·속" })).toBeNull();
  });

  it("offers 에너지·무게 and 움직임·정지, which have no place on the figure, as two buttons under 몸 전체 (2026-11-01)", () => {
    toBody();
    for (const body of ["female", "male"] as const) expect(zonesOf(body).map((zone) => zone.region)).not.toContain("movement");
    const aside = screen.getByRole("group", { name: ko.body.figure.wholeBody });
    expect(within(aside).getAllByRole("button").map((button) => button.textContent)).toEqual(["에너지·무게", "움직임·정지"]);
    fireEvent.click(within(aside).getByRole("button", { name: "에너지·무게" }));
    expect(within(screen.getByRole("region", { name: "에너지·무게" })).getByRole("button", { name: /몸이 무거움/ })).toBeInTheDocument();
    fireEvent.click(within(aside).getByRole("button", { name: "움직임·정지" }));
    expect(screen.queryByRole("region", { name: "에너지·무게" })).toBeNull();
    expect(within(screen.getByRole("region", { name: "움직임·정지" })).getByRole("button", { name: /안절부절못함/ })).toBeInTheDocument();
  });

  it("shows an organ only for the pressed region in 누른 곳만, and chest and belly always in 늘 보이기", () => {
    const tap = { ...DEFAULT_FIGURE_PREFS, mode: "tap" as const };
    expect(organLayers(tap, null).filter((layer) => layer.visible)).toEqual([]);
    expect(organLayers(tap, "heart").filter((layer) => layer.visible).map((layer) => layer.organ)).toEqual(["heart"]);
    expect(organLayers(tap, "muscle").filter((layer) => layer.visible)).toEqual([]);
    const always = { ...DEFAULT_FIGURE_PREFS, mode: "always" as const };
    expect(organLayers(always, null).filter((layer) => layer.visible).map((layer) => layer.organ)).toEqual(["chest", "belly"]);
    for (const layer of organLayers(always, null)) expect(layer.src).toMatch(/^\/body-figure\/[a-z]+_[a-z]+_[a-z]+\.webp$/);
  });

  it("places every zone inside the figure", () => {
    for (const body of ["female", "male"] as const) {
      for (const zone of zonesOf(body)) {
        const box = zoneBox(zone, body);
        for (const value of [box.left, box.top, box.width, box.height]) {
          const number = parseFloat(value);
          expect(number).toBeGreaterThanOrEqual(0);
          expect(number).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});

describe("the figure's choices stay on this device", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("starts from the proposed defaults, saves a change under its own key, and ignores a broken value", () => {
    expect(loadFigurePrefs()).toEqual({ body: "female", style: "line", mode: "tap", hidden: false });
    expect(saveFigurePrefs({ body: "male", style: "real", mode: "always", hidden: false })).toBe(true);
    expect(loadFigurePrefs()).toEqual({ body: "male", style: "real", mode: "always", hidden: false });
    // a value saved before 그림 없이 existed still shows the figure
    window.localStorage.setItem(FIGURE_PREFS_KEY, JSON.stringify({ body: "male", style: "flat", mode: "tap" }));
    expect(loadFigurePrefs()).toEqual({ body: "male", style: "flat", mode: "tap", hidden: false });
    const keys = getStorageKeys();
    expect(FIGURE_PREFS_KEY).not.toBe(keys.DRAFT_KEY);
    expect(FIGURE_PREFS_KEY).not.toBe(keys.COMPLETED_KEY);
    window.localStorage.setItem(FIGURE_PREFS_KEY, JSON.stringify({ body: "robot" }));
    expect(loadFigurePrefs()).toEqual(DEFAULT_FIGURE_PREFS);
  });

  it("changes the figure from 그림 바꾸기 and keeps the choice out of the draft, the records and an export", () => {
    toBody();
    fireEvent.click(screen.getByText(ko.body.figure.settings));
    fireEvent.click(screen.getByRole("button", { name: ko.body.figure.body.male }));
    fireEvent.click(screen.getByRole("button", { name: ko.body.figure.style.real }));
    fireEvent.click(screen.getByRole("button", { name: ko.body.figure.mode.always }));
    expect(loadFigurePrefs()).toEqual({ body: "male", style: "real", mode: "always", hidden: false });
    expect(screen.getByText(ko.body.figure.storageNote)).toBeInTheDocument();
    // pick a sensation from the figure and go on, so the step is saved
    fireEvent.click(within(screen.getByRole("group", { name: ko.body.figure.ariaLabel })).getAllByRole("button", { name: "심박" })[0]);
    fireEvent.click(within(screen.getByRole("region", { name: "심박" })).getByRole("button", { name: /심장이 빠르게 뜀/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
    const draft = loadDraft();
    expect(draft?.deepReflection?.body).toEqual([{ label: "심장이 빠르게 뜀" }]);
    const everything = JSON.stringify({ draft, completed: loadCompleted(), export: serializeExport(buildExport(loadCompleted())) });
    for (const trace of ["body-figure", "figurePrefs", "hidden", '"male"', '"female"', '"real"', '"line"', '"tap"', '"always"', "남성형", "여성형", "실사", "선화"]) {
      expect(everything, trace).not.toContain(trace);
    }
  });
});

describe("그림 없이 (owner's decision 2026-11-01)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("hides the figure, its hint and credit, keeps the list and 그림 바꾸기, saves the choice on this device, and can show the figure again", () => {
    toBody();
    fireEvent.click(screen.getByText(ko.body.figure.settings));
    fireEvent.click(screen.getByRole("button", { name: ko.body.figure.visible.hidden }));
    expect(screen.queryByRole("group", { name: ko.body.figure.ariaLabel })).toBeNull();
    expect(screen.queryByText(ko.body.figure.hint)).toBeNull();
    expect(screen.queryByText(ko.body.figure.credit)).toBeNull();
    expect(screen.queryByRole("group", { name: ko.body.figure.wholeBody })).toBeNull();
    expect(screen.getByText(ko.body.figure.settings)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /특별히 모르겠음/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ko.body.more })).toBeInTheDocument();
    expect(loadFigurePrefs().hidden).toBe(true);
    // enter again: only the draft goes, the figure choice stays
    cleanup();
    window.localStorage.removeItem(getStorageKeys().DRAFT_KEY);
    toBody();
    expect(screen.queryByRole("group", { name: ko.body.figure.ariaLabel })).toBeNull();
    fireEvent.click(screen.getByText(ko.body.figure.settings));
    fireEvent.click(screen.getByRole("button", { name: ko.body.figure.visible.shown }));
    expect(screen.getByRole("group", { name: ko.body.figure.ariaLabel })).toBeInTheDocument();
    expect(loadFigurePrefs().hidden).toBe(false);
  });
});

describe("motion and network", () => {
  it("fades the organ layers in 0.35s and not at all under reduced motion", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.body-figure-organ \{ opacity: 0; transition: opacity \.35s ease; \}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.body-figure-organ \{ transition: none; \} \}/);
  });

  it("draws the figure from this origin only", () => {
    expect(figure.path.startsWith("/body-figure/")).toBe(true);
    const source = readFileSync("app/body-figure.tsx", "utf8") + readFileSync("lib/body-figure.ts", "utf8");
    expect(source).not.toMatch(/https?:\/\//);
    // tests/no-network.test.ts keeps checking app/ and lib/ for network-sending APIs
  });
});
