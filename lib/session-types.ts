export type EntryDecision = "observe" | "unsure" | "stop";
// The user declining to pick a word is a normal answer, not missing data.
export type QuickNonSelection = "none-close" | "unsure";
export type SessionStatus = "draft" | "completed" | "stopped";
export type SessionEntry = "quick" | "deep";
/** How well the generated synthesis matched, in the user's own judgement. */
export type SynthesisFit = "close" | "partly" | "unsure";
export type Scale = 1 | 2 | 3 | 4 | 5;
export type Stage =
  | "landing"
  | "quick-affect"
  | "quick-candidates"
  | "granularity"
  | "context-contrast"
  | "micro-learning"
  | "quick-summary"
  | "entry"
  | "entry-mini"
  | "body"
  | "affect"
  | "context"
  | "meaning"
  | "emotion"
  | "outcome"
  | "summary"
  | "stopped";

export type BodyObservation = {
  label: string;
  intensity?: "low" | "medium" | "high";
  custom?: boolean;
};

export type EmotionSelection = {
  label: string;
  source: "suggested" | "custom";
};

/** The fast first read of one's own state. Never overwritten by the deep pass. */
export type QuickCheck = {
  affect?: { valence?: Scale; activation?: Scale; unknown?: boolean };
  candidatePool: EmotionSelection[];
  selected: EmotionSelection[];
  candidateResponse?: QuickNonSelection;
  concept?: string;
  granularityResponse?: "unsure";
  contrastAnswer?: string;
  microLearningSeen?: boolean;
  endedAt?: string;
};

/** The slower pass. Created only once the user is past the entry gate. */
export type DeepReflection = {
  startedAt: string;
  entryDecision?: EntryDecision;
  body: BodyObservation[];
  affect?: { valence?: Scale; activation?: Scale };
  context?: {
    eventText?: string;
    source?: "event" | "memory" | "anticipation" | "thought";
  };
  concerns: string[];
  emotionCandidates: EmotionSelection[];
  outcome?: {
    clarity: "much_clearer" | "clearer" | "same" | "more_complex" | "more_distressed";
    usefulness: "helpful" | "unsure" | "unhelpful";
    note?: string;
  };
};

/**
 * One moment of self-observation is one session, however deep the user went.
 * A completed Quick Check can be reopened to add a Deep Reflection under the
 * same id, so the two never split into separate records.
 */
export type EmotionSession = {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: SessionStatus;
  stage: Stage;
  entry: SessionEntry;
  quickCheck?: QuickCheck;
  deepReflection?: DeepReflection;
  /** Reserved for checking whether the summary is useful; never shown back as a score. */
  synthesisFeedback?: { fit?: SynthesisFit; correction?: string };
  stopReason?: "user" | "entry";
  /** Carried over from the v1 storage shape, where some fields were unrecoverable. */
  migratedFromV1?: true;
};

export type SessionDepth = "quick" | "quick+deep" | "deep";

/** Derived, never stored: what the record actually holds decides its depth. */
export const sessionDepth = (session: EmotionSession): SessionDepth => {
  if (session.quickCheck && session.deepReflection) return "quick+deep";
  if (session.deepReflection) return "deep";
  if (session.quickCheck) return "quick";
  return session.entry;
};

export type SessionAction =
  | { type: "START_QUICK" }
  | { type: "START_DEEP" }
  | { type: "ENTER_DEEP" }
  | { type: "RESUME"; session: EmotionSession }
  | { type: "SET_QUICK_AFFECT"; affect: NonNullable<QuickCheck["affect"]> }
  | { type: "SET_QUICK_UNKNOWN" }
  | { type: "SET_QUICK_CANDIDATES"; candidatePool: EmotionSelection[] }
  | { type: "TOGGLE_QUICK_CANDIDATE"; label: string }
  | { type: "SET_QUICK_CANDIDATE_RESPONSE"; response: QuickNonSelection }
  | { type: "ADD_QUICK_CUSTOM"; label: string }
  | { type: "OPEN_GRANULARITY" }
  | { type: "CHOOSE_GRANULARITY"; concept: string }
  | { type: "SKIP_GRANULARITY" }
  | { type: "SET_CONTRAST"; answer: string }
  | { type: "DISMISS_MICRO_LEARNING" }
  | { type: "COMPLETE_QUICK" }
  | { type: "SET_ENTRY"; decision: EntryDecision }
  | { type: "SET_ENTRY_MINI"; helpful: "yes" | "unsure" | "no" }
  | { type: "SET_BODY"; body: BodyObservation[] }
  | { type: "SET_AFFECT"; affect: NonNullable<DeepReflection["affect"]> }
  | { type: "SET_CONTEXT"; context: NonNullable<DeepReflection["context"]> }
  | { type: "SET_CONCERNS"; concerns: string[] }
  | { type: "SET_EMOTIONS"; emotionCandidates: EmotionSelection[] }
  | { type: "SET_OUTCOME"; outcome: NonNullable<DeepReflection["outcome"]> }
  | { type: "SET_SYNTHESIS_FEEDBACK"; fit?: SynthesisFit; correction?: string }
  | { type: "STOP"; reason: "user" | "entry" };

export const createSession = (entry: SessionEntry = "quick"): EmotionSession => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  status: "draft",
  stage: "landing",
  entry,
});

const emptyQuickCheck = (): QuickCheck => ({ candidatePool: [], selected: [] });

const emptyDeepReflection = (): DeepReflection => ({
  startedAt: new Date().toISOString(),
  body: [],
  concerns: [],
  emotionCandidates: [],
});

const withQuick = (state: EmotionSession, patch: Partial<QuickCheck>): EmotionSession => ({
  ...state,
  quickCheck: { ...(state.quickCheck ?? emptyQuickCheck()), ...patch },
});

const withDeep = (state: EmotionSession, patch: Partial<DeepReflection>): EmotionSession => ({
  ...state,
  deepReflection: { ...(state.deepReflection ?? emptyDeepReflection()), ...patch },
});

/** Quick Check ends here: the session is finished unless the user reopens it. */
const completeQuick = (state: EmotionSession, patch: Partial<QuickCheck> = {}): EmotionSession => {
  const now = new Date().toISOString();
  return {
    ...withQuick(state, { endedAt: now, ...patch }),
    stage: "quick-summary",
    status: "completed",
    completedAt: now,
  };
};

export const sessionReducer = (state: EmotionSession, action: SessionAction): EmotionSession => {
  switch (action.type) {
    case "START_QUICK":
      return { ...createSession("quick"), stage: "quick-affect", quickCheck: emptyQuickCheck() };
    case "START_DEEP":
      // deepReflection waits until the user is past the gate, so refusing it leaves no empty record.
      return { ...createSession("deep"), stage: "entry" };
    case "ENTER_DEEP":
      // Reopen: same id, same quickCheck, no longer completed.
      return { ...state, stage: "entry", status: "draft", completedAt: undefined };
    case "RESUME":
      return action.session;

    case "SET_QUICK_AFFECT":
      return { ...withQuick(state, { affect: action.affect }), stage: "quick-candidates" };
    case "SET_QUICK_UNKNOWN":
      return completeQuick(state, { affect: { unknown: true }, selected: [] });
    case "SET_QUICK_CANDIDATES":
      return { ...withQuick(state, { candidatePool: action.candidatePool, selected: [] }), stage: "quick-candidates" };
    case "TOGGLE_QUICK_CANDIDATE": {
      const selected = state.quickCheck?.selected ?? [];
      return withQuick(state, {
        candidateResponse: undefined,
        selected: selected.some((item) => item.label === action.label)
          ? selected.filter((item) => item.label !== action.label)
          : [...selected, { label: action.label, source: "suggested" }],
      });
    }
    case "SET_QUICK_CANDIDATE_RESPONSE":
      // Stays on the candidate step so the user can still end here or go deeper.
      return withQuick(state, { candidateResponse: action.response, selected: [] });
    case "ADD_QUICK_CUSTOM": {
      const label = action.label.trim();
      const selected = state.quickCheck?.selected ?? [];
      if (!label || selected.some((item) => item.label === label)) return state;
      return withQuick(state, { candidateResponse: undefined, selected: [...selected, { label, source: "custom" }] });
    }
    case "OPEN_GRANULARITY":
      return { ...state, stage: "granularity" };
    case "CHOOSE_GRANULARITY":
      return { ...withQuick(state, { concept: action.concept }), stage: "context-contrast" };
    case "SKIP_GRANULARITY":
      // Never pick a concept on the user's behalf; record the answer and move on.
      return completeQuick(state, { granularityResponse: "unsure", concept: undefined });
    case "SET_CONTRAST":
      return { ...withQuick(state, { contrastAnswer: action.answer }), stage: "micro-learning" };
    case "DISMISS_MICRO_LEARNING":
      return completeQuick(state, { microLearningSeen: true });
    case "COMPLETE_QUICK":
      return completeQuick(state);

    case "SET_ENTRY":
      if (action.decision === "stop") {
        return { ...state, stage: "stopped", status: "stopped", stopReason: "entry" };
      }
      if (action.decision === "unsure") {
        return { ...state, stage: "entry-mini" };
      }
      return { ...withDeep(state, { entryDecision: "observe" }), stage: "body", status: "draft" };
    case "SET_ENTRY_MINI":
      return action.helpful === "yes"
        ? { ...withDeep(state, { entryDecision: "unsure" }), stage: "body", status: "draft" }
        : { ...state, stage: "stopped", status: "stopped", stopReason: "entry" };
    case "SET_BODY":
      return { ...withDeep(state, { body: action.body }), stage: "affect" };
    case "SET_AFFECT":
      // Kept beside quickCheck.affect, never overwriting the first quick read.
      return { ...withDeep(state, { affect: action.affect }), stage: "context" };
    case "SET_CONTEXT":
      return { ...withDeep(state, { context: action.context }), stage: "meaning" };
    case "SET_CONCERNS":
      return { ...withDeep(state, { concerns: action.concerns }), stage: "emotion" };
    case "SET_EMOTIONS":
      return { ...withDeep(state, { emotionCandidates: action.emotionCandidates }), stage: "outcome" };
    case "SET_OUTCOME": {
      const now = new Date().toISOString();
      return {
        ...withDeep(state, { outcome: action.outcome }),
        stage: "summary",
        status: "completed",
        completedAt: now,
      };
    }
    case "SET_SYNTHESIS_FEEDBACK": {
      // Merged onto a finished session: rating the summary must not erase a rewrite,
      // and rewriting it must not answer the rating. Stage and status stay as they are.
      const feedback = { ...state.synthesisFeedback };
      if (action.fit) feedback.fit = action.fit;
      if (action.correction !== undefined) feedback.correction = action.correction.trim() || undefined;
      return { ...state, synthesisFeedback: feedback };
    }
    case "STOP":
      return { ...state, stage: "stopped", status: "stopped", stopReason: action.reason };
  }
};
