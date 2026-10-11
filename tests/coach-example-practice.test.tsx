import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { APPRAISAL_ESCAPES, COACH_ESCAPES, coachOrigin, coachResult, coachSets } from "../lib/coach";
import { createSession, sessionReducer } from "../lib/session-types";
import { buildSynthesis } from "../lib/synthesis";
import { summarise } from "../lib/records";
import { getLegacyStorageKeys, migrateLegacyStorage } from "../lib/migrations";
import { loadCompleted, loadDraft, persistSession } from "../lib/storage";
import type { CoachSet } from "../lib/coach";
import type { EmotionSession } from "../lib/session-types";

/** A quick check parked on the candidate step with one of the set's words picked. */
const atCandidates = (word: string): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: word, source: "suggested" }] });
  return sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: word });
};

const deepFinished = (word: string): EmotionSession => {
  let state = sessionReducer(atCandidates(word), { type: "COMPLETE_QUICK" });
  state = sessionReducer(state, { type: "ENTER_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.3, activation: 0.7 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "회의가 길어졌다", source: "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["공정했으면 했다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: [{ label: word, source: "suggested" }] });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "same", usefulness: "unsure" } });
};

/** Walks the coach with the given picks and returns to the summary. */
const throughCoach = (start: EmotionSession, picks: { appraisals?: string[]; words?: string[]; own?: string } = {}) => {
  let state = sessionReducer(start, { type: start.stage === "quick-candidates" ? "OPEN_GRANULARITY" : "OPEN_COACH" });
  for (const id of picks.appraisals ?? []) state = sessionReducer(state, { type: "TOGGLE_APPRAISAL", id });
  state = sessionReducer(state, { type: "GO_TO_COACH_WORDS" });
  for (const label of picks.words ?? []) state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label });
  if (picks.own) state = sessionReducer(state, { type: "SET_COACH_OWN_WORD", label: picks.own });
  state = sessionReducer(state, { type: "FINISH_COACH" });
  return sessionReducer(state, { type: "CLOSE_COACH" });
};

/** Opens the app on a parked draft and steps into the coach for that set. */
const openCoachFor = (set: CoachSet) => {
  persistSession(atCandidates(set.words[0]));
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
  fireEvent.click(screen.getByRole("button", { name: /표현 사이의 차이 살펴보기/ }));
};

/** The example's results, found by the role a screen reader announces. */
const exampleResult = () => screen.getByRole("region", { name: "예시 연습 결과" });

const next = () => fireEvent.click(screen.getByRole("button", { name: /다음/ }));

const offeredWordLabels = () =>
  Array.from(document.querySelectorAll(".chip-grid button")).map((button) => button.textContent?.replace("✓ ", ""));

const NO_EFFECT_CLAIM = /치료|진단|향상|개선|정확해|정확도|나아[지졌]|좋아[지졌]|효과|정상입니다|비정상|우월|열등/;

describe("the coach as practice on an example", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  // 1
  it("says it is an example before anything is chosen, outside any disclosure", () => {
    openCoachFor(coachSets[0]);
    const notice = screen.getByText(/예시 상황으로 해보는 표현 연습입니다/);
    expect(notice.closest("details")).toBeNull();
    expect(screen.getByText(/실제 일이나 지금 감정을 기록하는 단계가 아니고/)).toBeTruthy();
    expect(screen.getByText("예시 상황")).toBeTruthy();
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it("says so on the candidate step too, before the coach is opened", () => {
    persistSession(atCandidates("짜증"));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
    expect(screen.getByText(/예시 상황으로 해보는 짧은 연습입니다. 지금 고른 표현은 그대로 남습니다/)).toBeTruthy();
  });

  // 2 and 10
  it.each(coachSets.map((set) => [set.id, set] as const))("shows no expression on the observation step of %s", (_id, set) => {
    openCoachFor(set);
    const shown = document.querySelector(".screen")!.textContent ?? "";
    for (const word of set.words) expect(shown).not.toContain(word);
    for (const escape of COACH_ESCAPES) expect(screen.queryByRole("button", { name: escape })).toBeNull();
    // the same escapes and own-words field on every set
    for (const escape of APPRAISAL_ESCAPES) expect(screen.getByRole("button", { name: escape.text })).toBeTruthy();
    expect(screen.getByLabelText(/내 말로 적기/)).toBeTruthy();
  });

  // 3
  it.each(coachSets.flatMap((set) => [...set.appraisals, ...APPRAISAL_ESCAPES].map((item) => [set.id, item.id, set] as const)))(
    "offers the same words, unselected, whichever observation is picked (%s / %s)",
    (_set, appraisalId, set) => {
      openCoachFor(set);
      const option = [...set.appraisals, ...APPRAISAL_ESCAPES].find((item) => item.id === appraisalId)!;
      fireEvent.click(screen.getByRole("button", { name: option.text }));
      next();
      expect(offeredWordLabels()).toEqual([...set.words, ...COACH_ESCAPES]);
      expect(document.querySelectorAll('.chip-grid [aria-pressed="true"]')).toHaveLength(0);
      expect(screen.getByLabelText("내 말로 표현하기")).toHaveProperty("value", "");
    },
  );

  it("never fills in a word from an observation, at the reducer either", () => {
    for (const set of coachSets) {
      for (const option of [...set.appraisals, ...APPRAISAL_ESCAPES]) {
        let state = sessionReducer(atCandidates(set.words[0]), { type: "OPEN_GRANULARITY" });
        state = sessionReducer(state, { type: "TOGGLE_APPRAISAL", id: option.id });
        state = sessionReducer(state, { type: "GO_TO_COACH_WORDS" });
        expect(state.coach?.wordsAfter).toEqual([]);
        expect(state.coach?.ownWord).toBeUndefined();
      }
    }
  });

  // 4 and accessibility of the word step
  it("takes several words and a typed one, and exposes the selection to assistive tech", () => {
    openCoachFor(coachSets[0]);
    next();
    fireEvent.click(screen.getByRole("button", { name: "억울함" }));
    fireEvent.click(screen.getByRole("button", { name: "답답함" }));
    expect(screen.getByRole("button", { name: "억울함" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "짜증" }).getAttribute("aria-pressed")).toBe("false");
    // the mark is visible but kept out of the accessible name
    expect(screen.getByRole("button", { name: "억울함" }).textContent).toBe("✓ 억울함");
    fireEvent.change(screen.getByLabelText("내 말로 표현하기"), { target: { value: "김이 새는 느낌" } });
    next();
    const card = exampleResult().textContent ?? "";
    expect(card).toContain("억울함 · 답답함 · “김이 새는 느낌”");
  });

  it.each([
    ["nothing picked", [] as string[], "고르지 않음"],
    ["잘 모르겠음", ["잘 모르겠음"], "잘 모르겠음"],
    ["어느 것도 아님", ["어느 것도 아님"], "어느 것도 아님"],
  ])("treats %s as a normal way through", (_name, picks, shown) => {
    openCoachFor(coachSets[1]);
    next();
    for (const label of picks) fireEvent.click(screen.getByRole("button", { name: label }));
    next();
    const rows = Array.from(exampleResult().querySelectorAll(".summary-row strong")).map((row) => row.textContent);
    expect(rows).toEqual(["고르지 않음", shown]);
    fireEvent.click(screen.getByRole("button", { name: "요약으로 돌아가기" }));
    expect(screen.getByText("여기까지 살펴보았습니다.")).toBeTruthy();
  });

  // 7
  it("does not set the user's own words beside the example's", () => {
    openCoachFor(coachSets[0]); // the user's own word is 짜증
    fireEvent.click(screen.getByRole("button", { name: /같은 말을 여러 번 해야 했다/ }));
    next();
    fireEvent.click(screen.getByRole("button", { name: "답답함" }));
    next();
    const shown = document.querySelector(".screen")!.textContent ?? "";
    expect(shown).not.toMatch(/살펴보기 전|살펴본 뒤|전에는|뒤에는|달라졌|바뀌었/);
    expect(exampleResult().textContent).not.toContain("짜증");
    expect(shown).toContain("예시 연습의 결과입니다");
  });

  // 11
  it("makes no claim of treatment, diagnosis or improvement anywhere in the coach", () => {
    for (const set of coachSets) {
      expect(JSON.stringify(set)).not.toMatch(NO_EFFECT_CLAIM);
      cleanup();
      window.localStorage.clear();
      openCoachFor(set);
      expect(document.body.textContent).not.toMatch(NO_EFFECT_CLAIM);
      next();
      expect(document.body.textContent).not.toMatch(NO_EFFECT_CLAIM);
      next();
      expect(document.body.textContent).not.toMatch(NO_EFFECT_CLAIM);
    }
  });
});

describe("the example stays apart from the user's own record", () => {
  beforeEach(() => window.localStorage.clear());

  // 5
  it("leaves the quick and deep choices exactly as they were", () => {
    const quickStart = atCandidates("짜증");
    const afterQuick = throughCoach(quickStart, { appraisals: ["repeated"], words: ["억울함", "답답함"], own: "김새는 느낌" });
    expect(afterQuick.quickCheck?.selected).toEqual(quickStart.quickCheck?.selected);
    expect(afterQuick.quickCheck?.candidatePool).toEqual(quickStart.quickCheck?.candidatePool);

    const deepStart = deepFinished("억울함");
    const afterDeep = throughCoach(deepStart, { words: ["짜증"], own: "김새는 느낌" });
    expect(afterDeep.deepReflection).toEqual(deepStart.deepReflection);
    expect(afterDeep.quickCheck).toEqual(deepStart.quickCheck);
  });

  // 6
  it("is not read by the synthesis or the record list", () => {
    for (const start of [atCandidates("짜증"), deepFinished("억울함")]) {
      const done = throughCoach(start, { appraisals: ["open-ended"], words: ["답답함"], own: "김새는 느낌" });
      const withoutCoach = { ...done, coach: undefined };
      expect(buildSynthesis(done)).toEqual(buildSynthesis(withoutCoach));
      expect(summarise(done)).toEqual(summarise(withoutCoach));
      expect(JSON.stringify(buildSynthesis(done))).not.toContain("김새는 느낌");
    }
  });

  it("keeps wordsBefore as a snapshot of the user's own words", () => {
    const done = throughCoach(atCandidates("짜증"), { words: ["답답함"] });
    expect(done.coach?.wordsBefore).toEqual(["짜증"]);
    expect(done.coach?.wordsAfter).toEqual(["답답함"]);
  });
});

describe("where a coach record came from", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  // 8
  it("marks every new pass as example practice", () => {
    expect(throughCoach(atCandidates("평온")).coach?.origin).toBe("example-practice");
    expect(throughCoach(deepFinished("억울함")).coach?.origin).toBe("example-practice");
  });

  const legacyCoach = { setId: "friction-unfair-stuck", wordsBefore: ["짜증"], appraisals: ["repeated"], wordsAfter: ["답답함"], ownWord: "김새는 느낌" };

  it("reads a coach saved before the field existed as unknown, and changes nothing in it", () => {
    expect(coachOrigin(legacyCoach)).toBe("unknown");
    const old = { ...throughCoach(atCandidates("짜증")), coach: legacyCoach };
    persistSession(old);
    const [stored] = loadCompleted();
    expect(stored.coach).toEqual(legacyCoach);
    expect(coachResult(stored)?.origin).toBe("unknown");
  });

  it("carries a v3 coach through migration without giving it an origin", () => {
    const { V3_COMPLETED_KEY } = getLegacyStorageKeys();
    const v3 = { ...throughCoach(atCandidates("짜증")), coach: legacyCoach };
    window.localStorage.setItem(V3_COMPLETED_KEY, JSON.stringify([v3]));
    migrateLegacyStorage();
    expect(loadCompleted()[0].coach).toEqual(legacyCoach);
  });

  it("does not call an unknown record an example when it is shown", () => {
    let parked = sessionReducer(atCandidates("짜증"), { type: "OPEN_GRANULARITY" });
    parked = sessionReducer(parked, { type: "FINISH_COACH" });
    persistSession({ ...parked, coach: legacyCoach });
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
    const card = document.querySelector(".summary-card")!.textContent ?? "";
    expect(card).toContain("이 단계에서 고른 표현");
    expect(card).not.toContain("예시에");
    expect(screen.getByText(/예시 연습으로 저장되었는지는 확인할 수 없습니다/)).toBeTruthy();
  });
});

describe("saving, resuming, going back, stopping and returning", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  // 9
  it("finishes a quick check that went through the coach, instead of leaving a draft", () => {
    const done = throughCoach(atCandidates("짜증"), { words: ["답답함"] });
    expect(done.stage).toBe("quick-summary");
    expect(done.status).toBe("completed");
    expect(done.quickCheck?.endedAt).toBeTruthy();
    persistSession(done);
    expect(loadDraft()).toBeNull();
    expect(loadCompleted().map((item) => item.id)).toEqual([done.id]);
  });

  it("returns a deep session to its own summary without reopening it", () => {
    const start = deepFinished("억울함");
    const done = throughCoach(start);
    expect(done.stage).toBe("summary");
    expect(done.status).toBe("completed");
    expect(done.completedAt).toBe(start.completedAt);
  });

  it("resumes a pass left half-way, with its picks", () => {
    let parked = sessionReducer(atCandidates("짜증"), { type: "OPEN_GRANULARITY" });
    parked = sessionReducer(parked, { type: "TOGGLE_APPRAISAL", id: "unheard" });
    parked = sessionReducer(parked, { type: "GO_TO_COACH_WORDS" });
    parked = sessionReducer(parked, { type: "TOGGLE_COACH_WORD", label: "억울함" });
    persistSession(parked);
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
    expect(screen.getByRole("button", { name: "억울함" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/눈에 띈 것 · 내가 한 말이 없는 것처럼 지나갔다/)).toBeTruthy();
  });

  it("steps back through the coach keeping every pick", () => {
    let state = sessionReducer(atCandidates("짜증"), { type: "OPEN_GRANULARITY" });
    state = sessionReducer(state, { type: "TOGGLE_APPRAISAL", id: "repeated" });
    state = sessionReducer(state, { type: "GO_TO_COACH_WORDS" });
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "답답함" });
    state = sessionReducer(state, { type: "BACK" });
    expect(state.stage).toBe("coach-appraisal");
    expect(state.coach?.appraisals).toEqual(["repeated"]);
    expect(state.coach?.wordsAfter).toEqual(["답답함"]);
    state = sessionReducer(state, { type: "BACK" });
    expect(state.stage).toBe("quick-candidates");
    expect(state.quickCheck?.selected.map((item) => item.label)).toEqual(["짜증"]);
  });

  it.each([0, 1, 2])("puts the practice down from coach screen %i without stopping the record", (steps) => {
    openCoachFor(coachSets[0]);
    for (let step = 0; step < steps; step += 1) next();
    // visible on every coach screen, not behind a disclosure
    const leave = screen.getByRole("button", { name: /예시 연습 그만하고 요약으로|요약으로 돌아가기/ });
    expect(leave.closest("details")).toBeNull();
    fireEvent.click(leave);
    expect(screen.getByText("여기까지 살펴보았습니다.")).toBeTruthy();
    const [saved] = loadCompleted();
    expect(saved.status).toBe("completed");
    expect(saved.quickCheck?.selected.map((item) => item.label)).toEqual(["짜증"]);
    expect(loadDraft()).toBeNull();
  });

  it("can be stopped from any coach screen", () => {
    openCoachFor(coachSets[0]);
    for (let step = 0; step < 3; step += 1) {
      expect(screen.getByRole("button", { name: "그만하기" })).toBeTruthy();
      expect(screen.getByRole("button", { name: /한 단계 뒤로/ })).toBeTruthy();
      if (step < 2) next();
    }
    fireEvent.click(screen.getByRole("button", { name: "그만하기" }));
    fireEvent.click(screen.getByRole("button", { name: "여기서 그만하기" }));
    expect(screen.getByText(/지금은 더 살펴보지/)).toBeTruthy();
  });
});
