import { coachSetFor, currentWords } from "./coach";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";

export type EntryDecision = "observe" | "unsure" | "stop";
// The user declining to pick a word is a normal answer, not missing data.
export type QuickNonSelection = "none-close" | "unsure";
export type SessionStatus = "draft" | "completed" | "stopped";
export type SessionEntry = "quick" | "deep";
/** How well the generated synthesis matched, in the user's own judgement. */
export type SynthesisFit = "close" | "partly" | "unsure";
/**
 * A point on the affect pad, normalised to 0..1 on each axis.
 * Never shown to the user as a number, and never a diagnosis.
 */
export type AffectPoint = { valence?: number; activation?: number; unknown?: boolean };
export type Stage =
  | "landing"
  | "quick-affect"
  | "quick-candidates"
  | "coach-appraisal"
  | "coach-words"
  | "coach-note"
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
  | "support"
  | "stopped";

export type BodyObservation = {
  label: string;
  intensity?: "low" | "medium" | "high";
  custom?: boolean;
};

export type EmotionSelection = {
  label: string;
  source: "suggested" | "custom";
  /**
   * What the word carries for this person. The offered vocabulary is a starting
   * point, not a complete list, so a word the user brought is a normal entry —
   * this is where its meaning lives rather than in a separate store.
   */
  personalMeaning?: string;
};

/** The fast first read of one's own state. Never overwritten by the deep pass. */
export type QuickCheck = {
  affect?: AffectPoint;
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
  /**
   * A second reading after moving, if the user ever takes one. Kept beside the
   * first rather than replacing it: a body that feels different later is part of
   * the experience changing, not a correction. No flow writes this yet.
   */
  bodyRecheck?: { at: string; body: BodyObservation[]; prompt?: string };
  affect?: AffectPoint;
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
  /**
   * The direction the user is exploring and what they picked inside it. One need
   * at a time, kept per need so stepping between them loses nothing. The app
   * never tells the user what their need is.
   */
  support?: {
    need?: string;
    /** Every response picked, across needs. */
    chosen: string[];
    choicesByNeed?: Record<string, string[]>;
    note?: string;
    /** A place to ask later; nothing asks on its own yet. */
    followUp?: { tried?: "yes" | "partly" | "no"; helped?: "yes" | "somewhat" | "no" | "unsure"; at?: string };
  };
  /**
   * A pass through the granularity coach: practice on a written example, not a
   * record of the user's own moment. Nothing here is merged into quickCheck,
   * deepReflection or the synthesis.
   */
  coach?: {
    /**
     * Where the answers came from. Written by every coach opened from now on;
     * records saved before it existed have none and read as unknown
     * (`coachOrigin`), because back then the words screen asked about the
     * user's own experience and we cannot tell which way they read it.
     */
    origin?: "example-practice";
    setId: string;
    /** The user's own words at the moment the coach opened. A snapshot, never edited by the coach. */
    wordsBefore: string[];
    /** Observations picked about the example. Several can be true at once: no appraisal owns a word. */
    appraisals: string[];
    ownAppraisal?: string;
    /** Expressions picked for the example, escapes included. Not the user's own words. */
    wordsAfter: string[];
    /** An expression typed for the example. Not the user's own words. */
    ownWord?: string;
  };
  /** Screens already passed, so a step can be undone without losing anything. */
  history?: Stage[];
  stopReason?: "user" | "entry";
  /** Carried over from the v1 storage shape, where some fields were unrecoverable. */
  migratedFromV1?: true;
  /**
   * The language the record was written in. The words in it are stored exactly
   * as the user saw them, so this says how to read them. Optional on purpose:
   * every record saved before it existed was written in Korean and reads as
   * Korean (`localeOf`), so no stored record needs migrating.
   */
  locale?: Locale;
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
  | { type: "START_QUICK"; locale?: Locale }
  | { type: "START_DEEP"; locale?: Locale }
  | { type: "ENTER_DEEP" }
  | { type: "RESUME"; session: EmotionSession }
  | { type: "SET_QUICK_AFFECT"; affect: NonNullable<QuickCheck["affect"]> }
  | { type: "SET_QUICK_UNKNOWN" }
  | { type: "SET_QUICK_CANDIDATES"; candidatePool: EmotionSelection[] }
  | { type: "TOGGLE_QUICK_CANDIDATE"; label: string }
  | { type: "SET_QUICK_CANDIDATE_RESPONSE"; response: QuickNonSelection }
  | { type: "ADD_QUICK_CUSTOM"; label: string }
  | { type: "SET_PERSONAL_MEANING"; label: string; meaning: string }
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
  | { type: "OPEN_SUPPORT" }
  | { type: "CHOOSE_NEED"; id: string }
  | { type: "TOGGLE_RESPONSE"; id: string }
  | { type: "OPEN_COACH" }
  | { type: "TOGGLE_APPRAISAL"; id: string }
  | { type: "SET_OWN_APPRAISAL"; label: string }
  | { type: "GO_TO_COACH_WORDS" }
  | { type: "TOGGLE_COACH_WORD"; label: string }
  | { type: "SET_COACH_OWN_WORD"; label: string }
  | { type: "FINISH_COACH" }
  | { type: "CLOSE_COACH" }
  | { type: "BACK" }
  | { type: "STOP"; reason: "user" | "entry" };

export const createSession = (entry: SessionEntry = "quick", locale: Locale = DEFAULT_LOCALE): EmotionSession => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  status: "draft",
  stage: "landing",
  entry,
  locale,
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

/** Where 더 이해하기 can lead, given how far the user already went. */
export const understandRoute = (session: EmotionSession): "deep" | "coach" | "none" => {
  if (!session.deepReflection) return "deep";
  return coachSetFor(session) ? "coach" : "none";
};

const openCoach = (state: EmotionSession): NonNullable<EmotionSession["coach"]> => {
  const set = coachSetFor(state);
  return { origin: "example-practice", setId: set?.id ?? "", wordsBefore: currentWords(state), appraisals: [], wordsAfter: [] };
};

/** A finished session can still be revisited, but not rewound past its summary. */
export const canGoBack = (session: EmotionSession) => (session.history?.length ?? 0) > 0;

/** Actions that do not move the user to another screen, so they are not steps to undo. */
const NOT_A_STEP = new Set<SessionAction["type"]>([
  "TOGGLE_QUICK_CANDIDATE", "SET_QUICK_CANDIDATE_RESPONSE", "ADD_QUICK_CUSTOM",
  "SET_SYNTHESIS_FEEDBACK", "CHOOSE_NEED", "TOGGLE_RESPONSE",
  "TOGGLE_COACH_WORD", "SET_COACH_OWN_WORD", "TOGGLE_APPRAISAL", "SET_OWN_APPRAISAL",
  "SET_PERSONAL_MEANING", "RESUME", "BACK",
]);

const reduce = (state: EmotionSession, action: SessionAction): EmotionSession => {
  switch (action.type) {
    case "START_QUICK":
      return { ...createSession("quick", action.locale), stage: "quick-affect", quickCheck: emptyQuickCheck() };
    case "START_DEEP":
      // deepReflection waits until the user is past the gate, so refusing it leaves no empty record.
      return { ...createSession("deep", action.locale), stage: "entry" };
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
    case "SET_PERSONAL_MEANING": {
      const selected = state.quickCheck?.selected ?? [];
      if (!selected.some((item) => item.label === action.label)) return state;
      return withQuick(state, {
        selected: selected.map((item) =>
          item.label === action.label ? { ...item, personalMeaning: action.meaning.trim() || undefined } : item),
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
      // from the quick candidate step; the coach asks what mattered before showing words
      return { ...state, stage: "coach-appraisal", coach: openCoach(state) };
    case "SKIP_GRANULARITY":
      // Never pick a concept on the user's behalf; record the answer and move on.
      return completeQuick(state, { granularityResponse: "unsure", concept: undefined });
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
    case "OPEN_SUPPORT":
      // reached from a finished summary; it must not reopen or end the session
      return { ...state, stage: "support", support: state.support ?? { chosen: [] } };
    case "CHOOSE_NEED":
      // one direction at a time, but switching never discards what was picked elsewhere
      return { ...state, support: { ...(state.support ?? { chosen: [] }), need: action.id } };
    case "TOGGLE_RESPONSE": {
      const support = state.support ?? { chosen: [] };
      const need = support.need;
      if (!need) return state;
      const byNeed = { ...(support.choicesByNeed ?? {}) };
      const current = byNeed[need] ?? [];
      byNeed[need] = current.includes(action.id) ? current.filter((id) => id !== action.id) : [...current, action.id];
      return { ...state, support: { ...support, choicesByNeed: byNeed, chosen: Object.values(byNeed).flat() } };
    }

    case "OPEN_COACH":
      return { ...state, stage: "coach-appraisal", coach: openCoach(state) };
    case "TOGGLE_APPRAISAL": {
      if (!state.coach) return state;
      const picked = state.coach.appraisals;
      return {
        ...state,
        coach: { ...state.coach, appraisals: picked.includes(action.id) ? picked.filter((id) => id !== action.id) : [...picked, action.id] },
      };
    }
    case "SET_OWN_APPRAISAL":
      return state.coach ? { ...state, coach: { ...state.coach, ownAppraisal: action.label.trim() || undefined } } : state;
    case "GO_TO_COACH_WORDS":
      return state.coach ? { ...state, stage: "coach-words" } : state;
    case "TOGGLE_COACH_WORD": {
      if (!state.coach) return state;
      const after = state.coach.wordsAfter;
      return {
        ...state,
        coach: {
          ...state.coach,
          wordsAfter: after.includes(action.label) ? after.filter((word) => word !== action.label) : [...after, action.label],
        },
      };
    }
    case "SET_COACH_OWN_WORD":
      return state.coach ? { ...state, coach: { ...state.coach, ownWord: action.label.trim() || undefined } } : state;
    case "FINISH_COACH":
      return { ...state, stage: "coach-note" };
    case "CLOSE_COACH":
      if (state.deepReflection) return { ...state, stage: "summary" };
      // Opened straight from the candidate step, the quick check was never ended;
      // landing on its summary without ending it would leave a draft behind.
      return state.status === "draft" && !state.quickCheck?.endedAt ? completeQuick(state) : { ...state, stage: "quick-summary" };
    case "BACK": {
      const history = state.history ?? [];
      if (!history.length) return state;
      return { ...state, stage: history[history.length - 1], history: history.slice(0, -1) };
    }
    case "STOP":
      return { ...state, stage: "stopped", status: "stopped", stopReason: action.reason };
    default:
      return state;
  }
};

/**
 * Records where the user came from, in one place rather than in every case, so
 * a step can be undone without any transition having to remember to do it.
 */
export const sessionReducer = (state: EmotionSession, action: SessionAction): EmotionSession => {
  const next = reduce(state, action);
  if (NOT_A_STEP.has(action.type) || next.stage === state.stage) return next;
  // a fresh session starts its own trail; a finished one is not rewound past its summary
  if (action.type === "START_QUICK" || action.type === "START_DEEP") return { ...next, history: [] };
  if (action.type === "CLOSE_COACH") return next;
  if (next.stage === "summary" || next.stage === "quick-summary" || next.stage === "stopped") {
    return { ...next, history: [] };
  }
  return { ...next, history: [...(state.history ?? []), state.stage] };
};
