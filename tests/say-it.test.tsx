import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { SayIt } from "../app/say-it";
import { getT } from "../lib/i18n";
import { I18nProvider } from "../lib/i18n/react";
import { en, enOnly } from "../lib/i18n/messages.en";
import { ko } from "../lib/i18n/messages.ko";
import { sayClauses, sayFromRecord, saySentence } from "../lib/say-it";
import type { EmotionSession } from "../lib/session-types";
import concernsKo from "../data/concerns.ko.json";
import concernsEn from "../data/concerns.en.json";
import needsKo from "../data/needs.ko.json";
import { startDeep } from "./helpers/start";

/**
 * The three-lines area under 「사실 / 내 느낌 / 원하는 것을 나눠 적기」 (2026-11-19):
 * filled from the record, joined by a fixed frame, with the person's words kept
 * letter for letter, and nothing typed there stored or sent.
 */
const t = getT("ko");
const SITUATION = "발표 준비가 밀림";
const CHOICE = needsKo.needs.find((need) => need.id === "express")!.responses!.find((option) => option.id === "three-parts")!.label;

const record = (over: Partial<EmotionSession> = {}): EmotionSession => ({
  id: "say-1",
  createdAt: "2026-11-19T09:00:00.000Z",
  status: "completed",
  stage: "support",
  entry: "deep",
  locale: "ko",
  deepReflection: {
    startedAt: "2026-11-19T09:00:00.000Z",
    body: [],
    context: { eventText: SITUATION },
    concerns: ["잘하고 싶었다"],
    emotionCandidates: [{ label: "걱정", source: "suggested" }],
  },
  support: { need: "express", chosen: ["three-parts"], choicesByNeed: { express: ["three-parts"] } },
  ...over,
});

const show = (session: EmotionSession = record(), locale: "ko" | "en" = "ko") =>
  render(<I18nProvider locale={locale}><SayIt session={session} label={CHOICE} /></I18nProvider>);
const said = () => document.querySelector("[data-said]")?.textContent ?? "";
const line = (name: string) => screen.getByLabelText(name) as HTMLTextAreaElement;

describe("the joining rule (lib/say-it.ts)", () => {
  it("joins the three lines in the frame, each inside quotation marks", () => {
    expect(saySentence({ fact: SITUATION, feel: "걱정", want: "잘하고 싶었다" }, false, t))
      .toBe("있었던 일은 “발표 준비가 밀림”. 그때 내 마음은 “걱정”에 가까웠고, 나한테 중요했던 건 “잘하고 싶었다”였어.");
  });

  it("drops the clause of an empty line, and the feeling ends the sentence when nothing follows it", () => {
    expect(saySentence({ fact: SITUATION, feel: "", want: "잘하고 싶었다" }, false, t)).toBe("있었던 일은 “발표 준비가 밀림”. 나한테 중요했던 건 “잘하고 싶었다”였어.");
    expect(saySentence({ fact: SITUATION, feel: "걱정", want: "  " }, false, t)).toBe("있었던 일은 “발표 준비가 밀림”. 그때 내 마음은 “걱정”에 가까웠어.");
    expect(saySentence({ fact: "", feel: "걱정", want: "쉼" }, false, t)).toBe("그때 내 마음은 “걱정”에 가까웠고, 나한테 중요했던 건 “쉼”이었어.");
    expect(saySentence({ fact: "", feel: "", want: "" }, false, t)).toBe("");
    expect(sayClauses({ fact: SITUATION, feel: "", want: "쉼" }, false, t).map((clause) => clause.key)).toEqual(["fact", "want"]);
  });

  it("picks 이었어 after a final consonant and 였어 after a vowel, looking past closing punctuation", () => {
    const end = (want: string, polite = false) => saySentence({ fact: "", feel: "", want }, polite, t);
    expect(end("인정")).toBe("나한테 중요했던 건 “인정”이었어.");
    expect(end("휴가")).toBe("나한테 중요했던 건 “휴가”였어.");
    expect(end("잘하고 싶었다.")).toBe("나한테 중요했던 건 “잘하고 싶었다.”였어.");
    expect(end("쉼!")).toBe("나한테 중요했던 건 “쉼!”이었어.");
    expect(end("인정", true)).toBe("저한테 중요했던 건 “인정”이었어요.");
    expect(end("휴가", true)).toBe("저한테 중요했던 건 “휴가”였어요.");
  });

  it("높여서 changes only the ending and 나/내 to 저/제", () => {
    expect(saySentence({ fact: SITUATION, feel: "걱정", want: "잘하고 싶었다" }, true, t))
      .toBe("있었던 일은 “발표 준비가 밀림”. 그때 제 마음은 “걱정”에 가까웠고, 저한테 중요했던 건 “잘하고 싶었다”였어요.");
    expect(saySentence({ fact: "", feel: "걱정", want: "" }, true, t)).toBe("그때 제 마음은 “걱정”에 가까웠어요.");
    expect(JSON.stringify(ko.sayIt.said)).not.toMatch(/가까웠고요/);
  });

  it("never conjugates or alters what was written: every line sits in the sentence letter for letter", () => {
    for (const words of [SITUATION, "밀렸다", "늦음", "화가 남", "함", "OK 3번", "“따옴표” 안", "줄\n바꿈"]) {
      for (const polite of [false, true]) {
        const sentence = saySentence({ fact: words, feel: words, want: words }, polite, t);
        expect(sentence.split(`“${words}”`).length - 1).toBe(3);
        expect(sentence).not.toMatch(/밀렸어|늦었어|났어|했어/);
      }
    }
  });

  it("takes the three lines from the record: situation, words joined with an interpunct, what mattered", () => {
    const session = record();
    session.deepReflection!.emotionCandidates.push({ label: "초조함", source: "custom" }, { label: ko.emotion.escapes.unsure, source: "suggested" });
    session.deepReflection!.concerns.push("쉬고 싶었다", concernsKo.at(-1)!);
    expect(sayFromRecord(session)).toEqual({ parts: { fact: SITUATION, feel: "걱정 · 초조함", want: "잘하고 싶었다 · 쉬고 싶었다" }, factFrom: "deep" });
    // the offered "not sure" stays the last entry of the list in both languages
    expect([concernsKo.at(-1), concernsEn.at(-1)]).toEqual(["잘 모르겠다", "I’m not sure"]);
  });

  it("falls back to the quick look's line and words, and leaves a line the record lacks empty", () => {
    const quick = record({ entry: "quick", deepReflection: undefined, quickCheck: { candidatePool: [], selected: [{ label: "답답함", source: "suggested" }], context: { eventText: "회의가 길어짐" } } });
    expect(sayFromRecord(quick)).toEqual({ parts: { fact: "회의가 길어짐", feel: "답답함", want: "" }, factFrom: "quick" });
    expect(sayFromRecord(record({ deepReflection: undefined }))).toEqual({ parts: { fact: "", feel: "", want: "" }, factFrom: undefined });
  });
});

describe("the three-lines area (app/say-it.tsx)", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("fills the three labelled lines from the record and says where each came from", () => {
    show();
    expect(line("사실").value).toBe(SITUATION);
    expect(line("내 느낌").value).toBe("걱정");
    expect(line("원하는 것").value).toBe("잘하고 싶었다");
    expect(line("사실")).toHaveAccessibleDescription("기록의 「상황」에서");
    expect(line("내 느낌")).toHaveAccessibleDescription("기록의 「가까웠던 말」에서");
    expect(line("원하는 것")).toHaveAccessibleDescription("기록의 「중요했던 것」에서");
    expect(said()).toBe("있었던 일은 “발표 준비가 밀림”. 그때 내 마음은 “걱정”에 가까웠고, 나한테 중요했던 건 “잘하고 싶었다”였어.");
  });

  it("marks a changed line 직접 적음, puts it in the sentence as typed, and drops an emptied line", () => {
    show();
    fireEvent.change(line("사실"), { target: { value: "발표 자료를 못 끝냄" } });
    expect(line("사실")).toHaveAccessibleDescription("직접 적음");
    expect(said()).toContain("있었던 일은 “발표 자료를 못 끝냄”.");
    fireEvent.change(line("사실"), { target: { value: SITUATION } });
    expect(line("사실")).toHaveAccessibleDescription("기록의 「상황」에서");
    fireEvent.change(line("내 느낌"), { target: { value: "" } });
    expect(line("내 느낌")).toHaveAccessibleDescription("");
    expect(line("내 느낌").placeholder).toBe(ko.sayIt.feelPlaceholder);
    expect(said()).toBe("있었던 일은 “발표 준비가 밀림”. 나한테 중요했던 건 “잘하고 싶었다”였어.");
  });

  it("a record with none of the three shows empty lines, no note about filling in, and 복사 is off", () => {
    show(record({ deepReflection: undefined }));
    for (const name of ["사실", "내 느낌", "원하는 것"]) expect(line(name).value).toBe("");
    expect(screen.queryByText(ko.sayIt.hint)).not.toBeInTheDocument();
    expect(screen.getByText(ko.sayIt.saidEmpty)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복사" })).toBeDisabled();
    fireEvent.change(line("내 느낌"), { target: { value: "걱정" } });
    expect(screen.getByRole("button", { name: "복사" })).toBeEnabled();
  });

  it("편하게 / 높여서 switches the endings", () => {
    show();
    const tone = screen.getByRole("group", { name: "말투" });
    expect(within(tone).getByRole("button", { name: "편하게" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(tone).getByRole("button", { name: "높여서" }));
    expect(within(tone).getByRole("button", { name: "높여서" })).toHaveAttribute("aria-pressed", "true");
    expect(said()).toBe("있었던 일은 “발표 준비가 밀림”. 그때 제 마음은 “걱정”에 가까웠고, 저한테 중요했던 건 “잘하고 싶었다”였어요.");
  });

  it("복사 puts the sentence on the clipboard, turns to 복사됨 and tells screen readers", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    show();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "복사" })); });
    expect(writeText).toHaveBeenCalledWith("있었던 일은 “발표 준비가 밀림”. 그때 내 마음은 “걱정”에 가까웠고, 나한테 중요했던 건 “잘하고 싶었다”였어.");
    expect(screen.getByRole("button", { name: "복사됨" })).toBeInTheDocument();
    expect(status).toHaveTextContent("복사됨");
    // changing a line makes it 복사 again
    fireEvent.change(line("사실"), { target: { value: "다른 일" } });
    expect(screen.getByRole("button", { name: "복사" })).toBeInTheDocument();
    expect(status).toHaveTextContent("");
  });

  it("says so when the device refuses the copy", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    show();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "복사" })); });
    expect(screen.getByRole("status")).toHaveTextContent(ko.sayIt.copyFailed);
    expect(screen.getByRole("button", { name: "복사" })).toBeInTheDocument();
  });

  it("지금은 말하지 않기 sits beside 복사 and answers that nothing typed here is kept", () => {
    show();
    const hold = screen.getByRole("button", { name: "지금은 말하지 않기" });
    expect(hold.parentElement).toBe(screen.getByRole("button", { name: "복사" }).parentElement);
    expect(hold.parentElement!.previousElementSibling).toHaveTextContent("이 문장은 어디에도 보내지지 않아요. 보낼지, 누구에게 보낼지는 직접 정해요.");
    expect(screen.queryByText("괜찮아요. 여기 적은 것은 남지 않아요.")).not.toBeInTheDocument();
    fireEvent.click(hold);
    expect(hold).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("괜찮아요. 여기 적은 것은 남지 않아요.")).toBeInTheDocument();
  });

  it("hides the threads from screen readers and does not read the sentence back while typing", () => {
    show();
    const area = screen.getByRole("region", { name: CHOICE });
    expect(area.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(area.querySelectorAll("[aria-live]")).toHaveLength(0);
    expect(document.querySelector("[data-said]")!.closest("[role='status'], [aria-live]")).toBeNull();
    expect(area.querySelectorAll("[role='status']")).toHaveLength(1);
    // every control is a native field or button, so the keyboard reaches all of them
    expect(area.querySelectorAll("textarea, button")).toHaveLength(3 + 2 + 2);
    expect(area.querySelectorAll("[tabindex]")).toHaveLength(0);
  });

  it("moves nothing when the device asks for reduced motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    const animate = vi.fn();
    (SVGElement.prototype as unknown as { animate: unknown }).animate = animate;
    render(<I18nProvider locale="ko"><SayIt session={record()} label={CHOICE} play /></I18nProvider>);
    fireEvent.change(line("사실"), { target: { value: "다른 일" } });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(animate).not.toHaveBeenCalled();
    expect(document.querySelector("[data-said] [class*='tinted']")).toBeNull();
    delete (SVGElement.prototype as unknown as { animate?: unknown }).animate;
  });

  it("with motion allowed, a changed line lights its thread once and tints its part for a moment", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const animate = vi.fn();
    const proto = SVGElement.prototype as unknown as { animate?: unknown; getTotalLength?: unknown };
    proto.animate = animate;
    proto.getTotalLength = () => 200;
    const sized = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    show();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(animate).not.toHaveBeenCalled(); // shown still: nothing moves on its own
    fireEvent.change(line("사실"), { target: { value: "다른 일" } });
    act(() => { vi.advanceTimersByTime(460); });
    expect(animate).toHaveBeenCalledTimes(1);
    expect((animate.mock.calls[0][1] as { duration: number }).duration).toBeLessThanOrEqual(650);
    expect(document.querySelector("[data-said] [class*='tinted']")).toHaveTextContent("다른 일");
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector("[data-said] [class*='tinted']")).toBeNull();
    delete proto.animate;
    delete proto.getTotalLength;
    sized.mockRestore();
  });

  it("the English screen has the same area as a draft, without the Korean endings switch", () => {
    vi.stubEnv("NODE_ENV", "production");
    const session = record({ locale: "en" });
    session.deepReflection = { ...session.deepReflection!, context: { eventText: "The slides are behind" }, concerns: ["I wanted to do well"], emotionCandidates: [{ label: "worried", source: "suggested" }] };
    show(session, "en");
    expect(line(en.sayIt.fact).value).toBe("The slides are behind");
    expect(said()).toBe("“The slides are behind” is what happened. Back then, “worried” was close to how I felt, and “I wanted to do well” was what mattered to me.");
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByText(enOnly.draftNote)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.sayIt.copy })).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});

describe("on the need screen", () => {
  const stubGridSize = () => {
    Element.prototype.getBoundingClientRect = function () {
      return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
  };
  const stored = () => [window.localStorage, window.sessionStorage].map((store) => Object.keys(store).map((key) => store.getItem(key)).join("\n")).join("\n");
  const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
  const pick = (name: string) => screen.getByRole("button", { name: new RegExp(name.replace(/[/]/g, "\\/")) });

  const toExpress = () => {
    render(<Home />);
    startDeep();
    press(/조금 살펴보고 싶어요/);
    press(new RegExp(`^${ko.common.skip}`)); // body
    press(new RegExp(`^${ko.common.skip}`)); // affect
    fireEvent.change(document.querySelector("textarea")!, { target: { value: SITUATION } });
    press(new RegExp(`^${ko.common.next}`)); // context
    press("잘하고 싶었다");
    press(new RegExp(`^${ko.common.next}`)); // meaning
    press(new RegExp(`^${ko.common.skip}`)); // words
    press("조금 더 분명해짐");
    press("도움됨");
    press(new RegExp(`^${ko.common.next}`));
    press(new RegExp(`^${ko.summary.support}`));
    press("누군가에게 표현할 준비하기");
  };

  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); stubGridSize(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("opens under its choice with the record's lines, and closes when another choice is pressed", () => {
    toExpress();
    expect(screen.queryByRole("region", { name: CHOICE })).not.toBeInTheDocument();
    fireEvent.click(pick(CHOICE));
    const area = screen.getByRole("region", { name: CHOICE });
    expect(within(area).getByLabelText("사실")).toHaveValue(SITUATION);
    expect(within(area).getByLabelText("내 느낌")).toHaveValue("");
    expect(within(area).getByLabelText("원하는 것")).toHaveValue("잘하고 싶었다");
    expect(area.previousElementSibling).toBe(pick(CHOICE).parentElement);

    fireEvent.click(pick("지금 이야기할 때인지 먼저 판단하기"));
    expect(screen.queryByRole("region", { name: CHOICE })).not.toBeInTheDocument();
    // the choice itself stays picked, as before this area existed
    expect(pick(CHOICE)).toHaveAttribute("aria-pressed", "true");
    // pressing it again brings the area back, from the record, and keeps the pick
    fireEvent.click(pick(CHOICE));
    expect(pick(CHOICE)).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("region", { name: CHOICE })).getByLabelText("사실")).toHaveValue(SITUATION);
    // pressing it while open unpicks it and closes the area
    fireEvent.click(pick(CHOICE));
    expect(pick(CHOICE)).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: CHOICE })).not.toBeInTheDocument();
  });

  it("stores nothing typed in the area, in any browser store, and forgets it when the area closes", async () => {
    const opened = vi.fn();
    vi.stubGlobal("indexedDB", { open: opened });
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    toExpress();
    fireEvent.click(pick(CHOICE));
    const before = stored();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const TYPED = ["저장되면 안 되는 사실", "저장되면 안 되는 느낌", "저장되면 안 되는 바람"];
    ["사실", "내 느낌", "원하는 것"].forEach((name, index) => fireEvent.change(screen.getByLabelText(name), { target: { value: TYPED[index] } }));
    press("높여서");
    await act(async () => { press("복사"); });
    press("지금은 말하지 않기");
    expect(setItem).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    expect(stored()).toBe(before);
    for (const text of [...TYPED, "있었던 일은", "중요했던 건"]) expect(stored()).not.toContain(text);
    // the record keeps the choice's name, as before
    expect(stored()).toContain("three-parts");

    fireEvent.click(pick("지금 이야기할 때인지 먼저 판단하기"));
    fireEvent.click(pick(CHOICE));
    expect(screen.getByLabelText("사실")).toHaveValue(SITUATION);
    for (const text of TYPED) expect(stored()).not.toContain(text);
    setItem.mockRestore();
  });

  it("the area's own code touches no storage and no network", () => {
    for (const file of ["app/say-it.tsx", "lib/say-it.ts"]) {
      const code = readFileSync(join(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/localStorage|sessionStorage|indexedDB|storage-adapter|voice-store|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share/);
    }
  });
});
