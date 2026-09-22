import { describe, expect, it } from "vitest";
import { buildSynthesis } from "../lib/synthesis";
import { createSession, sessionReducer } from "../lib/session-types";
import type { EmotionSession } from "../lib/session-types";

const quickOnly = (): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.25, activation: 1 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

const deepAfterQuick = (emotion = "억울함"): EmotionSession => {
  let state = sessionReducer(quickOnly(), { type: "ENTER_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "어깨가 굳음" }, { label: "숨이 얕음" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.5, activation: 0.25 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "회의에서 말을 못 했다", source: "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["존중받고 싶었다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: [{ label: emotion, source: "suggested" }] });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
};

const allText = (session: EmotionSession) => {
  const synthesis = buildSynthesis(session);
  return [...synthesis.observed, ...synthesis.meaning].map((line) => line.text).join("\n");
};

describe("synthesis content", () => {
  it("restates only what a quick-only session recorded", () => {
    const text = allText(quickOnly());
    expect(text).toContain("불쾌함 쪽");
    expect(text).toContain("긴장");
    expect(text).not.toContain("몸에서는");
    expect(text).not.toContain("상황으로는");
  });

  it("connects body, affect, context, meaning and words for a deep session", () => {
    const synthesis = buildSynthesis(deepAfterQuick());
    const ids = synthesis.observed.map((line) => line.id);
    expect(ids).toEqual(["body", "deep-affect", "context", "meaning-entry", "emotion", "affect-before-after"]);
    const text = allText(deepAfterQuick());
    expect(text).toContain("“어깨가 굳음”, “숨이 얕음”을");
    expect(text).toContain("“회의에서 말을 못 했다”");
    expect(text).toContain("실제 사건");
    expect(text).toContain("“존중받고 싶었다”를");
    expect(text).toContain("억울함");
  });

  it("puts the quick reading beside the deep one instead of repeating it as a line", () => {
    const synthesis = buildSynthesis(deepAfterQuick());
    expect(synthesis.observed.map((line) => line.id).filter((id) => id === "quick-affect")).toEqual([]);
    expect(synthesis.observed.map((line) => line.id)).toContain("affect-before-after");
    const text = synthesis.observed.filter((line) => line.id === "affect-before-after").map((line) => line.text).join("\n");
    expect(text).toContain("처음 빠른 확인에서는");
    expect(text).toContain("조금 더 살펴본 뒤에는");
  });

  it("notes that the words changed, without calling either version better", () => {
    const synthesis = buildSynthesis(deepAfterQuick("억울함"));
    const clues = [...synthesis.meaning, ...synthesis.unknown].map((line) => line.text).join("\n");
    expect(clues + allText(deepAfterQuick("억울함"))).not.toMatch(/정확|개선|나아|향상|맞는 표현을 찾/);
  });

  it("reports a declined candidate list as an answer", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.25, activation: 1 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "none-close" });
    expect(allText(state)).toContain("가까운 말이 없다고 표시했습니다");
  });

  it("picks 을 after a closing consonant and 를 after a vowel", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "손이 차가움" }] });
    expect(allText(state)).toContain("“손이 차가움”을 알아차렸다고");

    // concerns are clauses ending in a vowel, so the particle has to change
    state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["쉬고 싶었다"] });
    expect(allText(state)).toContain("“쉬고 싶었다”를 골랐습니다");

    state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["공정했으면 했다", "잘하고 싶었다"] });
    expect(allText(state)).toContain("“공정했으면 했다”, “잘하고 싶었다”를 골랐습니다");
  });

  it("attaches the right particle in the changed-words sentence", () => {
    const synthesis = buildSynthesis(deepAfterQuick("억울함"));
    const clue = synthesis.meaning.concat(synthesis.unknown).map((line) => line.text).join("\n");
    const everything = clue + allText(deepAfterQuick("억울함"));
    expect(everything).not.toContain("억울함를");
  });

  it("uses 으로 after the affect labels, which all end in a consonant", () => {
    const deep = allText(deepAfterQuick());
    expect(deep).toContain("가라앉음으로 표시했습니다");
    expect(deep).not.toContain("가라앉음로");

    const quick = allText(quickOnly());
    expect(quick).toContain("느낌으로 표시했습니다");
    expect(quick).not.toContain("느낌로");
  });

  it("has nothing observed to show for an empty session", () => {
    expect(buildSynthesis(createSession()).observed).toEqual([]);
  });
});

describe("synthesis guardrails", () => {
  const sessions = [quickOnly(), deepAfterQuick(), deepAfterQuick("긴장")];

  it("never tells the user what they are", () => {
    for (const session of sessions) {
      const synthesis = buildSynthesis(session);
      const everything = [synthesis.lead, synthesis.caveat, ...synthesis.observed, ...synthesis.meaning, ...synthesis.unknown]
        .map((part) => (typeof part === "string" ? part : part.text))
        .join("\n");
      expect(everything).not.toMatch(/당신은|당신의 성격|경향이 있|유형입니다/);
    }
  });

  it("never asserts a cause or infers anyone's intent", () => {
    for (const session of sessions) {
      expect(allText(session)).not.toMatch(/때문에|탓|그래서|이유는|의도|상대는|그 사람은/);
    }
  });

  it("avoids hedged interpretation phrasing", () => {
    for (const session of sessions) {
      expect(allText(session)).not.toMatch(/것으로 보입니다|듯합니다|추측|판단됩니다|분석/);
    }
  });

  it("is deterministic for the same input", () => {
    const session = deepAfterQuick();
    expect(JSON.stringify(buildSynthesis(session))).toBe(JSON.stringify(buildSynthesis(session)));
  });
});
