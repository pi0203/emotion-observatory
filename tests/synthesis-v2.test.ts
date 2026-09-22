import { describe, expect, it } from "vitest";
import { buildSynthesis } from "../lib/synthesis";
import { createSession, sessionReducer } from "../lib/session-types";
import type { EmotionSession } from "../lib/session-types";

const quick = (words: string[] = ["긴장"]): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.25, activation: 1 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: words.map((label) => ({ label, source: "suggested" as const })) });
  for (const label of words) state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

const deep = (over: { concerns?: string[]; words?: string[]; source?: "event" | "memory" | "anticipation" | "thought"; text?: string } = {}) => {
  let state = sessionReducer(quick(), { type: "ENTER_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "어깨가 굳음" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.5, activation: 0.25 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: over.text ?? "회의에서 말을 못 했다", source: over.source ?? "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: over.concerns ?? ["공정했으면 했다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: (over.words ?? ["억울함"]).map((label) => ({ label, source: "suggested" as const })) });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
};

const textOf = (lines: { text: string }[]) => lines.map((line) => line.text).join("\n");

describe("synthesis v2 structure", () => {
  it("separates what was observed from what might be connected and what is not known", () => {
    const synthesis = buildSynthesis(deep());
    expect(synthesis.observed.length).toBeGreaterThan(0);
    expect(synthesis.meaning.length).toBeGreaterThan(0);
    expect(Array.isArray(synthesis.unknown)).toBe(true);
    expect(synthesis.questions.length).toBeGreaterThanOrEqual(1);
    expect(synthesis.questions.length).toBeLessThanOrEqual(3);
  });

  it("keeps the v1 description intact under 관찰한 것", () => {
    const observed = textOf(buildSynthesis(deep()).observed);
    expect(observed).toContain("“어깨가 굳음”을");
    expect(observed).toContain("“회의에서 말을 못 했다”");
    expect(observed).toContain("억울함");
  });
});

describe("synthesis v2 refuses to interpret without evidence", () => {
  it("says so plainly when there is only one clue", () => {
    const synthesis = buildSynthesis(quick());
    expect(synthesis.meaning).toEqual([]);
    expect(textOf(synthesis.unknown)).toContain("연결해볼 만한 정보가 충분하지 않습니다");
    expect(synthesis.questions.length).toBeGreaterThan(0);
  });

  it("needs two independent clues before it connects anything", () => {
    // one clue only: the words shifted, nothing else lines up
    const oneClue = buildSynthesis(deep({ concerns: ["잘 모르겠다"], words: ["슬픔"] }));
    expect(oneClue.meaning).toEqual([]);

    // two clues: the words shifted and the concern lines up with the word's tags
    const twoClues = buildSynthesis(deep({ concerns: ["공정했으면 했다"], words: ["억울함"] }));
    expect(twoClues.meaning.length).toBeGreaterThan(0);
  });

  it("does not count a broad tag as a clue on its own", () => {
    // 관계 is carried by a large share of the vocabulary, so an overlap there is weak
    const broad = buildSynthesis(deep({ concerns: ["이해받고 싶었다"], words: ["서운함"] }));
    expect(broad.meaning.map((line) => line.id)).not.toContain("concern-overlap");
  });
});

describe("synthesis v2 guardrails", () => {
  const sessions = [
    quick(),
    quick(["긴장", "편안함"]),
    deep(),
    deep({ words: ["긴장"] }),
    deep({ source: "anticipation", concerns: ["잘하고 싶었다"], words: ["긴장", "희망"] }),
    deep({ words: ["경외감"], concerns: ["잘 모르겠다"] }),
  ];
  const everything = (session: EmotionSession) => {
    const s = buildSynthesis(session);
    return [s.lead, s.caveat, ...s.observed, ...s.meaning, ...s.unknown].map((p) => (typeof p === "string" ? p : p.text)).concat(s.questions).join("\n");
  };

  it("never asserts a cause", () => {
    for (const session of sessions) expect(everything(session)).not.toMatch(/때문에|탓|그래서|이유는|원인/);
  });

  it("never infers anyone's intent or character", () => {
    for (const session of sessions) expect(everything(session)).not.toMatch(/당신은|의도|상대는|그 사람은|성격|애착|경향이 있|유형입니다/);
  });

  it("never grades the change between the two passes", () => {
    for (const session of sessions) expect(everything(session)).not.toMatch(/더 정확|개선|나아졌|향상|맞는 표현을 찾/);
  });

  it("never turns the pad position into a motivational direction", () => {
    for (const session of sessions) expect(everything(session)).not.toMatch(/접근|회피|다가가|물러나|피하려/);
  });

  it("asks questions that do not imply their own answer", () => {
    for (const session of sessions) {
      for (const question of buildSynthesis(session).questions) {
        expect(question.endsWith("?")).toBe(true);
        expect(question).not.toMatch(/아닌가요|맞지요|~때문|그렇지 않나요/);
      }
    }
  });

  it("is deterministic", () => {
    const session = deep();
    expect(JSON.stringify(buildSynthesis(session))).toBe(JSON.stringify(buildSynthesis(session)));
  });
});
