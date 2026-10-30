// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sessionReducer, createSession, type EmotionSession } from "../lib/session-types";
import { INPUT_LIMITS } from "../lib/limits";
import { buildExport, serializeExport, parseImport, planImport } from "../lib/record-transfer";
import { wordLines } from "../lib/records";

/**
 * Invariant & edge-case tests for the "Stay First, Names Later" architecture
 * (owner's decision 2026-10-30; docs/EVIDENCE_CHAIN.md §7, PRODUCT_SPEC §13).
 *
 * Checks:
 * 1. ADD_LABEL_LATER guards: ignores drafts, ignores id mismatches, ignores empty/whitespace strings.
 * 2. ADD_LABEL_LATER limits: strictly caps length at INPUT_LIMITS.word without throwing.
 * 3. Raw layer immutability: adding later labels preserves original pad coordinates,
 *    original selected words, and timestamps intact.
 * 4. Transfer durability: exportPayload and importRecords preserve labelsLater and wordsRevealed
 *    across serialize/deserialize round-trips.
 * 5. Word source classification: wordLines accurately identifies "picked" vs "pickedAfterReveal"
 *    based on wordsRevealed.
 */
describe("Stay First architecture invariants and edge cases", () => {
  const makeFinishedSession = (overrides?: Partial<EmotionSession>): EmotionSession => {
    const base = createSession("quick");
    return {
      ...base,
      id: "test-session-1",
      status: "completed",
      stage: "quick-summary",
      completedAt: "2026-10-30T10:00:00.000Z",
      quickCheck: {
        endedAt: "2026-10-30T10:00:00.000Z",
        affect: { valence: 0.8, activation: 0.6 },
        candidatePool: [],
        selected: [
          { label: "기쁨", source: "suggested" },
          { label: "직접적은말", source: "custom", personalMeaning: "자유로운 느낌" },
        ],
        wordsRevealed: { at: "2026-10-30T10:00:00.000Z" },
      },
      ...overrides,
    };
  };

  describe("ADD_LABEL_LATER action invariants", () => {
    it("rejects adding later labels to in-progress draft sessions", () => {
      const draft = makeFinishedSession({ status: "draft", stage: "quick-affect" });
      const next = sessionReducer(draft, {
        type: "ADD_LABEL_LATER",
        id: draft.id,
        label: "뒤늦은 깨달음",
      });
      expect(next.labelsLater).toBeUndefined();
      expect(next).toBe(draft);
    });

    it("rejects adding later labels when the id does not match", () => {
      const finished = makeFinishedSession();
      const next = sessionReducer(finished, {
        type: "ADD_LABEL_LATER",
        id: "foreign-id-999",
        label: "새 이름",
      });
      expect(next.labelsLater).toBeUndefined();
      expect(next).toBe(finished);
    });

    it("rejects empty or whitespace-only labels without adding an entry", () => {
      const finished = makeFinishedSession();
      const nextEmpty = sessionReducer(finished, {
        type: "ADD_LABEL_LATER",
        id: finished.id,
        label: "",
      });
      expect(nextEmpty.labelsLater).toBeUndefined();

      const nextWhitespace = sessionReducer(finished, {
        type: "ADD_LABEL_LATER",
        id: finished.id,
        label: "   \t\n  ",
      });
      expect(nextWhitespace.labelsLater).toBeUndefined();
    });

    it("truncates labels exceeding INPUT_LIMITS.word to the exact limit", () => {
      const finished = makeFinishedSession();
      const oversized = "가".repeat(INPUT_LIMITS.word + 50);
      const next = sessionReducer(finished, {
        type: "ADD_LABEL_LATER",
        id: finished.id,
        label: oversized,
      });
      expect(next.labelsLater).toHaveLength(1);
      expect(next.labelsLater![0].label).toHaveLength(INPUT_LIMITS.word);
      expect(next.labelsLater![0].label).toBe("가".repeat(INPUT_LIMITS.word));
    });

    it("appends multiple names chronologically at the end", () => {
      let state = makeFinishedSession();
      state = sessionReducer(state, {
        type: "ADD_LABEL_LATER",
        id: state.id,
        label: "첫 번째 덧붙임",
      });
      state = sessionReducer(state, {
        type: "ADD_LABEL_LATER",
        id: state.id,
        label: "두 번째 덧붙임",
      });

      expect(state.labelsLater).toHaveLength(2);
      expect(state.labelsLater![0].label).toBe("첫 번째 덧붙임");
      expect(state.labelsLater![1].label).toBe("두 번째 덧붙임");
    });

    it("guarantees absolute immutability of the raw layer (affect, selections, timestamps)", () => {
      const initial = makeFinishedSession();
      const next = sessionReducer(initial, {
        type: "ADD_LABEL_LATER",
        id: initial.id,
        label: "새로운 해석",
      });

      expect(next.quickCheck?.affect).toEqual(initial.quickCheck?.affect);
      expect(next.quickCheck?.selected).toEqual(initial.quickCheck?.selected);
      expect(next.completedAt).toBe(initial.completedAt);
      expect(next.createdAt).toBe(initial.createdAt);
      expect(next.quickCheck?.wordsRevealed).toBe(initial.quickCheck?.wordsRevealed);
    });

    it("allows adding later labels to stopped sessions as well", () => {
      const stopped = makeFinishedSession({
        status: "stopped",
        stage: "stopped",
        stopReason: "user",
      });
      const next = sessionReducer(stopped, {
        type: "ADD_LABEL_LATER",
        id: stopped.id,
        label: "멈춘 뒤의 이름",
      });
      expect(next.labelsLater).toHaveLength(1);
      expect(next.labelsLater![0].label).toBe("멈춘 뒤의 이름");
    });
  });

  describe("Transfer roundtrip durability", () => {
    it("preserves labelsLater and wordsRevealed through export and import", () => {
      const original = makeFinishedSession({
        labelsLater: [
          { label: "그때는 몰랐던 안도감", at: "2026-10-30T12:00:00.000Z" },
        ],
      });

      const file = buildExport([original]);
      const json = serializeExport(file);

      const parsed = parseImport(json);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        const plan = planImport(parsed, []);
        expect(plan.add).toHaveLength(1);
        const imported = plan.add[0];
        expect(imported.labelsLater).toEqual(original.labelsLater);
        expect(imported.quickCheck?.wordsRevealed).toEqual({ at: "2026-10-30T10:00:00.000Z" });
      }
    });
  });

  describe("wordLines classification of revealed words", () => {
    it("marks offered words picked before reveal as 'picked' and after reveal as 'pickedAfterReveal'", () => {
      const unrevealedSession = makeFinishedSession({
        quickCheck: {
          endedAt: "2026-10-30T10:00:00.000Z",
          candidatePool: [],
          selected: [{ label: "설렘", source: "suggested" }],
          wordsRevealed: undefined,
        },
      });
      expect(wordLines(unrevealedSession)).toEqual([
        { how: "picked", words: ["설렘"] },
      ]);

      const revealedSession = makeFinishedSession({
        quickCheck: {
          endedAt: "2026-10-30T10:00:00.000Z",
          candidatePool: [],
          selected: [{ label: "설렘", source: "suggested" }],
          wordsRevealed: { at: "2026-10-30T10:00:00.000Z" },
        },
      });
      expect(wordLines(revealedSession)).toEqual([
        { how: "pickedAfterReveal", words: ["설렘"] },
      ]);
    });

    it("marks typed words as 'wrote' regardless of whether words were revealed", () => {
      const customSession = makeFinishedSession({
        quickCheck: {
          endedAt: "2026-10-30T10:00:00.000Z",
          candidatePool: [],
          selected: [{ label: "내 느낌", source: "custom" }],
          wordsRevealed: { at: "2026-10-30T10:00:00.000Z" },
        },
      });
      expect(wordLines(customSession)).toEqual([
        { how: "wrote", words: ["내 느낌"] },
      ]);
    });
  });
});
