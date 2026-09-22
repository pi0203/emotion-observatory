import { describe, expect, it } from "vitest";
import { createSession, sessionReducer, understandRoute } from "../lib/session-types";
import { coachSetFor, coachSets } from "../lib/coach";
import needs from "../data/needs.ko.json";
import type { EmotionSession } from "../lib/session-types";

const quick = (words: string[] = ["짜증"]): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: words.map((label) => ({ label, source: "suggested" as const })) });
  for (const label of words) state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

const deep = (words: string[] = ["억울함"]): EmotionSession => {
  let state = sessionReducer(quick(), { type: "ENTER_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "가슴이 답답함" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.4, activation: 0.6 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "요청이 무시됐다", source: "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["공정했으면 했다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: words.map((label) => ({ label, source: "suggested" as const })) });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
};

describe("needs and responses", () => {
  it("offers a direction to try, never a verdict about what the user needs", () => {
    // only what the user actually reads; the file's own notes describe the rule itself
    const shown = needs.needs.flatMap((need) => [need.label, need.because ?? "", ...(need.responses ?? []).map((r) => r.label)]);
    for (const text of shown) {
      expect(text).not.toMatch(/당신에게 필요한 것은|당신의 진짜|해야 하므로|쌓이므로|하셔야|권장합니다/);
    }
    for (const need of needs.needs) {
      if (need.because) expect(need.because).toContain("고르셨기 때문에");
    }
  });

  it("keeps a way out inside every set of responses", () => {
    for (const need of needs.needs) {
      if (!need.responses) continue;
      expect(need.responses.length).toBeGreaterThanOrEqual(2);
      expect(need.responses.length).toBeLessThanOrEqual(4);
    }
  });

  it("treats savouring and looking at the conditions as separate directions", () => {
    const ids = needs.needs.map((need) => need.id);
    expect(ids).toContain("savour");
    expect(ids).toContain("conditions");
  });

  it("does not leave the pleasant directions at the bottom of the list", () => {
    const order = needs.needs.map((need) => need.id);
    // they were 7th and 8th, below the fold on a phone
    expect(order.indexOf("savour")).toBeLessThan(4);
    expect(order.indexOf("conditions")).toBeLessThan(6);
  });

  it("groups the directions without ranking them", () => {
    for (const need of needs.needs) expect(needs.groups).toContain(need.group);
    expect(needs.fieldNotes.group).toMatch(/추천이 아닙니다/);
  });

  it("records one need at a time and several responses under it", () => {
    let state = sessionReducer(quick(), { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
    expect(state.support?.need).toBe("express");
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "one-sentence" });
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "timing" });
    expect(state.support?.choicesByNeed?.express).toEqual(["one-sentence", "timing"]);
    expect(state.support?.chosen).toEqual(["one-sentence", "timing"]);
  });

  it("keeps what was chosen under a need the user steps away from and back to", () => {
    let state = sessionReducer(quick(), { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "one-sentence" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "pace" });
    expect(state.support?.choicesByNeed?.express).toEqual(["one-sentence"]);
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "loosen" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
    expect(state.support?.choicesByNeed?.express).toEqual(["one-sentence"]);
    expect(state.support?.chosen).toEqual(expect.arrayContaining(["one-sentence", "loosen"]));
  });

  it("does not end or reopen the session", () => {
    const finished = quick();
    let state = sessionReducer(finished, { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "nothing" });
    expect(state.status).toBe("completed");
    expect(state.completedAt).toBe(finished.completedAt);
    expect(state.id).toBe(finished.id);
  });
});

describe("where 더 이해하기 leads", () => {
  it("sends a quick-only session into the deep pass", () => {
    expect(understandRoute(quick())).toBe("deep");
  });

  it("sends a finished deep session to the coach when a set matches", () => {
    expect(understandRoute(deep(["억울함"]))).toBe("coach");
  });

  it("says there is nowhere to go when no set covers the chosen words", () => {
    expect(understandRoute(deep(["감사"]))).toBe("none");
  });
});

describe("granularity coach v2", () => {
  it("picks the set from the words the user most recently chose", () => {
    expect(coachSetFor(deep(["억울함"]))?.id).toBe("friction-unfair-stuck");
    expect(coachSetFor(quick(["짜증"]))?.id).toBe("friction-unfair-stuck");
    expect(coachSetFor(deep(["감사"]))).toBeUndefined();
  });

  it("asks what mattered before it shows any word", () => {
    const state = sessionReducer(deep(), { type: "OPEN_COACH" });
    expect(state.stage).toBe("coach-appraisal");
    expect(state.coach?.wordsBefore).toEqual(["억울함"]);
    expect(state.coach?.wordsAfter).toEqual([]);
  });

  it("never maps an appraisal to a word", () => {
    const blob = JSON.stringify(coachSetFor(deep()));
    for (const word of ["짜증", "억울함", "답답함"]) {
      // the words appear in `words` and in the closing note, never inside an appraisal
      for (const appraisal of coachSetFor(deep())!.appraisals) expect(appraisal.text).not.toContain(word);
    }
    expect(blob).not.toMatch(/에는 ‘[^’]+’(이|가) 더 가까/);
  });

  it("carries the appraisal through and lets the words be chosen again", () => {
    let state = sessionReducer(deep(), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "TOGGLE_APPRAISAL", id: "unfair" });
    expect(state.coach?.appraisals).toEqual(["unfair"]);
    state = sessionReducer(state, { type: "GO_TO_COACH_WORDS" });
    expect(state.stage).toBe("coach-words");
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "답답함" });
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "짜증" });
    expect(state.coach?.wordsAfter).toEqual(["답답함", "짜증"]);
    state = sessionReducer(state, { type: "FINISH_COACH" });
    expect(state.stage).toBe("coach-note");
  });

  it("accepts 잘 모르겠음 without choosing a word for the user", () => {
    let state = sessionReducer(deep(), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "TOGGLE_APPRAISAL", id: "unsure" });
    state = sessionReducer(state, { type: "FINISH_COACH" });
    expect(state.coach?.appraisals).toEqual(["unsure"]);
    expect(state.coach?.wordsAfter).toEqual([]);
  });

  it("takes a word the user typed instead of the offered ones", () => {
    let state = sessionReducer(deep(), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "GO_TO_COACH_WORDS" });
    state = sessionReducer(state, { type: "SET_COACH_OWN_WORD", label: "  김새는 느낌 " });
    expect(state.coach?.ownWord).toBe("김새는 느낌");
  });

  it("returns to the summary it came from", () => {
    let fromDeep = sessionReducer(deep(), { type: "OPEN_COACH" });
    fromDeep = sessionReducer(fromDeep, { type: "TOGGLE_APPRAISAL", id: "unfair" });
    fromDeep = sessionReducer(fromDeep, { type: "FINISH_COACH" });
    expect(sessionReducer(fromDeep, { type: "CLOSE_COACH" }).stage).toBe("summary");

    let fromQuick = sessionReducer(quick(), { type: "OPEN_COACH" });
    fromQuick = sessionReducer(fromQuick, { type: "TOGGLE_APPRAISAL", id: "unfair" });
    fromQuick = sessionReducer(fromQuick, { type: "FINISH_COACH" });
    expect(sessionReducer(fromQuick, { type: "CLOSE_COACH" }).stage).toBe("quick-summary");
  });

  it("records a change without calling it an improvement", () => {
    let state = sessionReducer(deep(["억울함"]), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "TOGGLE_APPRAISAL", id: "open-ended" });
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "답답함" });
    state = sessionReducer(state, { type: "FINISH_COACH" });
    expect(state.coach?.wordsBefore).toEqual(["억울함"]);
    expect(state.coach?.wordsAfter).toEqual(["답답함"]);
    expect(JSON.stringify(state.coach)).not.toMatch(/정확|개선|향상|improved/);
  });
});

describe("a word the user brought is an ordinary entry", () => {
  const withOwnWord = () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "짜증", source: "suggested" }] });
    return sessionReducer(state, { type: "ADD_QUICK_CUSTOM", label: "김새는 느낌" });
  };

  it("stores the meaning on the word rather than in a separate place", () => {
    let state = sessionReducer(withOwnWord(), { type: "SET_PERSONAL_MEANING", label: "김새는 느낌", meaning: "  기대가 접히는 쪽  " });
    const word = state.quickCheck?.selected.find((item) => item.label === "김새는 느낌");
    expect(word).toEqual({ label: "김새는 느낌", source: "custom", personalMeaning: "기대가 접히는 쪽" });
  });

  it("clears a meaning that is emptied out, and ignores an unknown word", () => {
    let state = sessionReducer(withOwnWord(), { type: "SET_PERSONAL_MEANING", label: "김새는 느낌", meaning: "무언가" });
    state = sessionReducer(state, { type: "SET_PERSONAL_MEANING", label: "김새는 느낌", meaning: "   " });
    expect(state.quickCheck?.selected[0].personalMeaning).toBeUndefined();
    expect(sessionReducer(state, { type: "SET_PERSONAL_MEANING", label: "없는말", meaning: "x" })).toEqual(state);
  });

  it("takes a meaning for an offered word too, not only a typed one", () => {
    let state = sessionReducer(withOwnWord(), { type: "TOGGLE_QUICK_CANDIDATE", label: "짜증" });
    state = sessionReducer(state, { type: "SET_PERSONAL_MEANING", label: "짜증", meaning: "나에게는 조금 다른 뜻" });
    expect(state.quickCheck?.selected.find((item) => item.label === "짜증")?.personalMeaning).toBe("나에게는 조금 다른 뜻");
  });

  it("is not a step to go back through", () => {
    const before = withOwnWord();
    const after = sessionReducer(before, { type: "SET_PERSONAL_MEANING", label: "김새는 느낌", meaning: "무언가" });
    expect(after.history).toEqual(before.history);
    expect(after.stage).toBe(before.stage);
  });
});

describe("neither universalism nor total relativism in the copy", () => {
  it("avoids both extremes wherever the user can read", () => {
    const blobs = [JSON.stringify(needs), JSON.stringify(coachSets)];
    for (const blob of blobs) {
      expect(blob).not.toMatch(/감정은 허구|실재하지 않|단지 언어일 뿐|생물학적 본질|고정된 지문|모든 문화/);
    }
  });

  it("says the coach shows one way of telling the words apart", () => {
    for (const set of coachSets) {
      expect(set.note).toMatch(/사람에 따라 다르고|여러 말이 동시에/);
    }
  });
});
