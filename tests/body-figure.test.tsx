import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import bodySignals from "../data/body-signals.ko.json";
import bodySignalsEn from "../data/body-signals.en.json";
import figure from "../data/body-figure.json";
import { ko } from "../lib/i18n/messages.ko";
import { DEFAULT_FIGURE_PREFS, FIGURE_LINE_RGB, FIGURE_PREFS_KEY, loadFigurePrefs, MIN_ZONE_PX, organLayers, REGION_IDS, saveFigurePrefs, zoneBox, zonePx, zonesOf } from "../lib/body-figure";
import { buildExport, serializeExport } from "../lib/record-transfer";
import { getStorageKeys, loadCompleted, loadDraft } from "../lib/storage";
import { en } from "../lib/i18n/messages.en";
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
      // the label starts with the region name; a part name may follow after " · "
      expect(bodySignals.regions).toContain(zone.getAttribute("aria-label")?.split(" · ")[0]);
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

  it("shows an organ only for the pressed region in 누른 곳만, and lungs, heart and belly always in 늘 보이기", () => {
    const tap = { ...DEFAULT_FIGURE_PREFS, mode: "tap" as const };
    expect(organLayers(tap, null).filter((layer) => layer.visible)).toEqual([]);
    expect(organLayers(tap, "heart").filter((layer) => layer.visible).map((layer) => layer.organ)).toEqual(["heart"]);
    expect(organLayers(tap, "muscle").filter((layer) => layer.visible)).toEqual([]);
    const always = { ...DEFAULT_FIGURE_PREFS, mode: "always" as const };
    // the line drawing draws the heart in its own layer, not inside the chest one (2026-11-01)
    expect(organLayers(always, null).filter((layer) => layer.visible).map((layer) => layer.organ)).toEqual(["chest", "heart", "belly"]);
    for (const layer of organLayers(always, null)) expect(layer.src).toMatch(/^\/body-figure\/[a-z]+_[a-z]+_[a-z]+\.webp$/);
  });

  it("draws every layer at the size the zones are measured against, 600×1124 for both figures (line drawings, 2026-11-01)", () => {
    // the width and height straight from the WebP header, so a redrawn file of another size is caught
    const webpSize = (file: string) => {
      const bytes = readFileSync(file);
      const chunk = bytes.toString("ascii", 12, 16);
      if (chunk === "VP8X") return { w: 1 + bytes.readUIntLE(24, 3), h: 1 + bytes.readUIntLE(27, 3) };
      if (chunk === "VP8L") { const bits = bytes.readUInt32LE(21); return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) }; }
      if (chunk === "VP8 ") return { w: bytes.readUInt16LE(26) & 0x3fff, h: bytes.readUInt16LE(28) & 0x3fff };
      throw new Error(`${file}: unknown WebP chunk ${chunk}`);
    };
    for (const body of ["female", "male"] as const) {
      expect(figure.canvas[body]).toEqual({ w: 600, h: 1124 });
      // the files the screen draws for this figure type: the body and its three organ layers
      window.localStorage.clear();
      saveFigurePrefs({ ...DEFAULT_FIGURE_PREFS, body });
      toBody();
      const sources = [...document.querySelectorAll(".body-figure img")].map((img) => img.getAttribute("src")!);
      expect(sources).toHaveLength(4);
      for (const src of sources) expect(webpSize(`public${src}`), src).toEqual(figure.canvas[body]);
      cleanup();
    }
  });

  it("draws the zones in the data's order, so a later zone sits on top and is hit first: shoulders over chest and belly, the heart last", () => {
    for (const body of ["female", "male"] as const) {
      const order = zonesOf(body).map((zone) => zone.part ?? zone.region);
      for (const shoulder of ["leftShoulder", "rightShoulder"]) {
        expect(order.indexOf(shoulder)).toBeGreaterThan(order.indexOf("breath"));
        expect(order.indexOf(shoulder)).toBeGreaterThan(order.indexOf("belly"));
      }
      expect(order[order.length - 1]).toBe("heart");
    }
    toBody();
    const rendered = within(screen.getByRole("group", { name: ko.body.figure.ariaLabel })).getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    const regionName = (id: string) => bodySignals.regions[REGION_IDS.indexOf(id)];
    expect(rendered).toEqual(zonesOf(DEFAULT_FIGURE_PREFS.body).map((zone) => zone.part ? `${regionName(zone.region)} · ${ko.body.figure.part[zone.part]}` : regionName(zone.region)));
  });

  it("places every zone by its centre inside the figure", () => {
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

  it("gives every zone at least 24×24px on a phone, where several are drawn smaller (owner's finding 2026-11-01)", () => {
    expect(MIN_ZONE_PX).toBe(24);
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.body-zone \{[^}]*min-width: 24px; min-height: 24px;[^}]*transform: translate\(-50%, -50%\)/);
    // at the phone width the figure is 220px wide and the heart and shoulders are smaller than the minimum: the CSS minimum is what makes them reachable
    const small = zonesOf("female").filter((zone) => { const px = zonePx(zone, "female", 220); return px.width < MIN_ZONE_PX || px.height < MIN_ZONE_PX; });
    expect(small.map((zone) => zone.part ?? zone.region)).toEqual(expect.arrayContaining(["heart", "neck", "leftShoulder", "rightShoulder"]));
  });

  it("tells the parts of one region apart for a screen reader, and marks the pressed part with an edge only", () => {
    toBody();
    const group = screen.getByRole("group", { name: ko.body.figure.ariaLabel });
    const names = within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(expect.arrayContaining(["근육·자세 · 목", "근육·자세 · 왼쪽 어깨", "근육·자세 · 오른쪽 어깨", "온도·피부 · 왼손", "온도·피부 · 오른손", "호흡·가슴", "배·속", "심박"]));
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.body-zone\.selected \{ background: transparent; border: 2px solid var\(--accent-ink\); \}/);
  });

  it("draws every line, the body's outline included, at 3:1 or more on the card in light and dark mode (line drawing, 2026-11-01)", () => {
    const css = readFileSync("app/globals.css", "utf8");
    // the layers sit on the card colour, and dark mode inverts every one of them, the base outline as well as the organs
    expect(css).toMatch(/\.body-figure \{[^}]*background: var\(--card\);/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{ \.body-figure-layer \{ filter: invert\(1\); \} \}/);
    expect(css).not.toMatch(/\.body-figure\.style-/);
    // the card is the chosen tone's card (:root[data-tone]), so every tone is checked, light and dark
    const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
    const cardsIn = (part: string) => [...part.matchAll(/--(?:tone-[a-z]+-)?card: (#[0-9A-Fa-f]{6})/g)].map((match) => match[1]);
    const lightCards = cardsIn(css.slice(0, darkStart));
    const darkCards = cardsIn(css.slice(darkStart, css.indexOf("\n}\n", darkStart)));
    expect(lightCards.length).toBeGreaterThanOrEqual(7);
    expect(darkCards.length).toBe(lightCards.length);
    const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const luminance = (rgb: readonly number[]) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
    const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
    const contrast = (a: readonly number[], b: readonly number[]) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const inverted = FIGURE_LINE_RGB.map((v) => 255 - v);
    for (const card of lightCards) expect(contrast(FIGURE_LINE_RGB, hex(card)), card).toBeGreaterThanOrEqual(3);
    for (const card of darkCards) {
      // as drawn, the grey all but vanishes on a dark card: this is why dark mode inverts it
      expect(contrast(FIGURE_LINE_RGB, hex(card)), card).toBeLessThan(3);
      expect(contrast(inverted, hex(card)), card).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the figure's choices stay on this device", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("starts from the proposed defaults, saves a change under its own key, and ignores a broken value", () => {
    expect(loadFigurePrefs()).toEqual({ body: "female", mode: "tap", hidden: false });
    expect(saveFigurePrefs({ body: "male", mode: "always", hidden: false })).toBe(true);
    expect(loadFigurePrefs()).toEqual({ body: "male", mode: "always", hidden: false });
    // a value saved before 그림 없이 existed still shows the figure
    window.localStorage.setItem(FIGURE_PREFS_KEY, JSON.stringify({ body: "male", mode: "tap" }));
    expect(loadFigurePrefs()).toEqual({ body: "male", mode: "tap", hidden: false });
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
    fireEvent.click(screen.getByRole("button", { name: ko.body.figure.mode.always }));
    expect(loadFigurePrefs()).toEqual({ body: "male", mode: "always", hidden: false });
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

describe("one style, the line drawing (owner's decision 2026-11-01: 「선화가 나은 것 같아. 색을 표시하는 건 별로」)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("offers no 표현 row in 그림 바꾸기, keeps 그림·체형·장기, and ships only the line drawing files", () => {
    toBody();
    fireEvent.click(screen.getByText(ko.body.figure.settings));
    const rows = [...document.querySelectorAll(".body-figure-settings .body-figure-choice")].map((row) => row.getAttribute("aria-label"));
    expect(rows).toEqual([ko.body.figure.visibleLabel, ko.body.figure.bodyLabel, ko.body.figure.modeLabel]);
    for (const gone of ["표현", "실사", "단색", "선화"]) expect(screen.queryByRole("button", { name: gone })).toBeNull();
    expect(Object.keys(ko.body.figure)).not.toContain("style");
    expect(readdirSync("public/body-figure").sort()).toEqual(
      ["female", "male"].flatMap((body) => ["base_line", "line_belly", "line_chest", "line_heart"].map((layer) => `${body}_${layer}.webp`)),
    );
  });

  it("reads a device that chose 실사 or 단색 before as the line drawing, keeping its figure type and organs", () => {
    for (const style of ["real", "flat"]) {
      window.localStorage.setItem(FIGURE_PREFS_KEY, JSON.stringify({ body: "male", style, mode: "always", hidden: false }));
      expect(loadFigurePrefs()).toEqual({ body: "male", mode: "always", hidden: false });
      toBody();
      const sources = [...document.querySelectorAll(".body-figure img")].map((img) => img.getAttribute("src"));
      expect(sources).toEqual(["/body-figure/male_base_line.webp", "/body-figure/male_line_chest.webp", "/body-figure/male_line_heart.webp", "/body-figure/male_line_belly.webp"]);
      cleanup();
      window.localStorage.clear();
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
    expect(document.querySelector(".body-figure-credit")).toBeNull();
    expect(screen.queryByRole("link", { name: ko.body.figure.licenseLink })).toBeNull();
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

describe("a word chosen from a region's list (owner's decision 2026-11-01)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  const firstGrid = () => document.querySelector(".body-region-panel + .chip-grid, .body-figure-wrap + .chip-grid") as HTMLElement;
  const labelsOf = (grid: HTMLElement) => [...grid.querySelectorAll("button")].map((button) => button.textContent?.replace("✓ ", ""));

  it("stays visible after that list closes, before 특별히 모르겠음 in the first list, and after coming back to the step; the region's list leaves 특별히 모르겠음 out", () => {
    toBody();
    const group = screen.getByRole("group", { name: ko.body.figure.ariaLabel });
    fireEvent.click(within(group).getAllByRole("button", { name: /배·속/ })[0]);
    const panel = screen.getByRole("region", { name: "배·속" });
    expect(within(panel).queryByRole("button", { name: /특별히 모르겠음/ })).toBeNull();
    fireEvent.click(within(panel).getByRole("button", { name: /속이 울렁거림/ }));
    fireEvent.click(within(group).getAllByRole("button", { name: /배·속/ })[0]);
    expect(screen.queryByRole("region", { name: "배·속" })).toBeNull();
    let labels = labelsOf(firstGrid());
    expect(labels.indexOf("속이 울렁거림")).toBe(labels.length - 2);
    expect(labels[labels.length - 1]).toBe("특별히 모르겠음");
    expect(screen.getByRole("button", { name: /속이 울렁거림/ }).getAttribute("aria-pressed")).toBe("true");
    // the figure itself carries no mark for a chosen word
    expect(within(group).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
    fireEvent.click(screen.getByRole("button", { name: ko.common.stepBack }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.body.title);
    labels = labelsOf(firstGrid());
    expect(labels.indexOf("속이 울렁거림")).toBe(labels.length - 2);
    expect(screen.getByRole("button", { name: /속이 울렁거림/ }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("이 기기의 기록 모두 지우기 (2026-11-01)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("also forgets the figure choice, and says so in the confirmation", () => {
    saveFigurePrefs({ body: "male", mode: "always", hidden: true });
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(screen.getByRole("button", { name: ko.recordTransfer.deleteAll }));
    expect(screen.getByText(ko.recordTransfer.deleteAllConfirmBody)).toBeInTheDocument();
    expect(ko.recordTransfer.deleteAllConfirmBody).toMatch(/몸 그림 선택/);
    fireEvent.click(screen.getByRole("button", { name: ko.recordTransfer.deleteAllConfirm }));
    expect(window.localStorage.getItem(FIGURE_PREFS_KEY)).toBeNull();
    expect(loadFigurePrefs()).toEqual(DEFAULT_FIGURE_PREFS);
  });
});

describe("where the figure comes from (line drawing, 2026-11-01)", () => {
  afterEach(cleanup);

  it("shows the manifest's credit line under the figure in both languages, and keeps the BodyParts3D attribution word for word (CC BY 4.0)", () => {
    expect(ko.body.figure.credit).toBe(figure.credit.line.ko);
    expect(en.body.figure.credit).toBe(figure.credit.line.en);
    const attribution = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International";
    expect(figure.credit.male.attribution).toBe(attribution);
    // the screen line carries the attribution word for word, as the BodyParts3D licence page asks, not the earlier short form (owner's decision 2026-11-01)
    for (const line of [ko.body.figure.credit, en.body.figure.credit]) {
      expect(line).toContain(attribution);
      expect(line).not.toContain("(© DBCLS, CC BY 4.0)");
      for (const part of ["MakeHuman", "CC0"]) expect(line, part).toContain(part);
    }
    for (const doc of ["docs/BODY_FIGURE_SOURCES.md", "docs/THIRD_PARTY.md"]) expect(readFileSync(doc, "utf8"), doc).toContain(`「${attribution}」`);
    // the earlier figure's credit is gone from the screen and the data
    expect(JSON.stringify(figure.credit) + ko.body.figure.credit + en.body.figure.credit).not.toMatch(/Häggström|Wikimedia/);
    window.localStorage.clear();
    toBody();
    const credit = document.querySelector(".body-figure-credit") as HTMLElement;
    expect(credit.textContent).toBe(`${figure.credit.line.ko} ${ko.body.figure.licenseLink}`);
    expect(credit.textContent).toContain(attribution);
    // the English screen draws the same attribution
    cleanup();
    window.localStorage.clear();
    render(EnglishPage());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.landing.start}`) }));
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.common.next}`) }));
    fireEvent.click(screen.getByRole("button", { name: en.quickCandidates.deep }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.entry.observe}`) }));
    const creditEn = document.querySelector(".body-figure-credit") as HTMLElement;
    expect(creditEn.textContent).toBe(`${figure.credit.line.en} ${en.body.figure.licenseLink}`);
    expect(creditEn.textContent).toContain(attribution);
  });

  it("links the CC BY 4.0 licence after the credit line, in the reader's language, in a new tab (owner's decision 2026-11-01)", () => {
    expect(ko.body.figure.licenseHref).toBe("https://creativecommons.org/licenses/by/4.0/deed.ko");
    expect(en.body.figure.licenseHref).toBe("https://creativecommons.org/licenses/by/4.0/deed.en");
    for (const text of [ko.body.figure.licenseLink, en.body.figure.licenseLink]) expect(text).toContain("CC BY 4.0");
    window.localStorage.clear();
    toBody();
    const link = within(document.querySelector(".body-figure-credit") as HTMLElement).getByRole("link", { name: ko.body.figure.licenseLink });
    expect(link.getAttribute("href")).toBe(ko.body.figure.licenseHref);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
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
    // the licence link's address is in the message files: a link the person may open, never something the page loads
    // tests/no-network.test.ts keeps checking app/ and lib/ for network-sending APIs
  });
});
