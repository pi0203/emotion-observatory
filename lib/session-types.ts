export type EntryDecision = "observe" | "unsure" | "stop";
// The user declining to pick a word is a normal answer, not missing data.
export type QuickNonSelection = "none-close" | "unsure";
export type SessionStatus = "draft" | "completed" | "stopped";
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

export type EmotionSession = {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: SessionStatus;
  mode: "quick" | "deep" | "quick-to-deep";
  stage: Stage;
  entryDecision?: EntryDecision;
  body: BodyObservation[];
  affect?: {
    valence?: 1 | 2 | 3 | 4 | 5;
    activation?: 1 | 2 | 3 | 4 | 5;
  };
  context?: {
    eventText?: string;
    source?: "event" | "memory" | "anticipation" | "thought";
  };
  concerns: string[];
  emotionCandidates: EmotionSelection[];
  quickCandidatePool?: EmotionSelection[];
  quickAffect?: {
    valence?: 1 | 2 | 3 | 4 | 5;
    activation?: 1 | 2 | 3 | 4 | 5;
    unknown?: boolean;
  };
  quickCandidateResponse?: QuickNonSelection;
  quickConcept?: string;
  quickGranularityResponse?: "unsure";
  quickContrastAnswer?: string;
  quickMicroLearningSeen?: boolean;
  outcome?: {
    clarity: "much_clearer" | "clearer" | "same" | "more_complex" | "more_distressed";
    usefulness: "helpful" | "unsure" | "unhelpful";
    note?: string;
  };
  stopReason?: "user" | "entry";
};

export type SessionAction =
  | { type: "START" }
  | { type: "START_QUICK" }
  | { type: "START_DEEP" }
  | { type: "ENTER_DEEP" }
  | { type: "RESUME"; session: EmotionSession }
  | { type: "SET_QUICK_AFFECT"; affect: NonNullable<EmotionSession["quickAffect"]> }
  | { type: "SET_QUICK_UNKNOWN" }
  | { type: "SET_QUICK_CANDIDATES"; emotionCandidates: EmotionSelection[] }
  | { type: "TOGGLE_QUICK_CANDIDATE"; label: string }
  | { type: "SET_QUICK_CANDIDATE_RESPONSE"; response: QuickNonSelection }
  | { type: "OPEN_GRANULARITY"; concept: string }
  | { type: "CHOOSE_GRANULARITY"; concept: string }
  | { type: "SKIP_GRANULARITY" }
  | { type: "SET_CONTRAST"; answer: string }
  | { type: "DISMISS_MICRO_LEARNING" }
  | { type: "COMPLETE_QUICK" }
  | { type: "SET_ENTRY"; decision: EntryDecision }
  | { type: "SET_ENTRY_MINI"; helpful: "yes" | "unsure" | "no" }
  | { type: "SET_BODY"; body: BodyObservation[] }
  | { type: "SET_AFFECT"; affect: NonNullable<EmotionSession["affect"]> }
  | { type: "SET_CONTEXT"; context: NonNullable<EmotionSession["context"]> }
  | { type: "SET_CONCERNS"; concerns: string[] }
  | { type: "SET_EMOTIONS"; emotionCandidates: EmotionSelection[] }
  | { type: "SET_OUTCOME"; outcome: NonNullable<EmotionSession["outcome"]> }
  | { type: "STOP"; reason: "user" | "entry" };

export const createSession = (): EmotionSession => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  status: "draft",
  mode: "deep",
  stage: "landing",
  body: [],
  concerns: [],
  emotionCandidates: [],
});

export const sessionReducer = (state: EmotionSession, action: SessionAction): EmotionSession => {
  switch (action.type) {
    case "START":
      return { ...createSession(), mode: "deep", stage: "entry" };
    case "START_DEEP":
      return { ...createSession(), mode: "deep", stage: "entry" };
    case "ENTER_DEEP":
      return {
        ...createSession(),
        mode: "quick-to-deep",
        stage: "entry",
        affect: state.quickAffect?.unknown || !state.quickAffect?.valence || !state.quickAffect?.activation
          ? undefined
          : { valence: state.quickAffect.valence, activation: state.quickAffect.activation },
        quickAffect: state.quickAffect,
        quickCandidatePool: state.emotionCandidates,
      };
    case "START_QUICK":
      return { ...createSession(), mode: "quick", stage: "quick-affect" };
    case "RESUME":
      return action.session;
    case "SET_QUICK_AFFECT":
      return { ...state, quickAffect: action.affect, stage: "quick-candidates" };
    case "SET_QUICK_UNKNOWN":
      return { ...state, quickAffect: { unknown: true }, emotionCandidates: [], stage: "quick-summary", status: "completed", completedAt: new Date().toISOString() };
    case "SET_QUICK_CANDIDATES":
      return { ...state, quickCandidatePool: action.emotionCandidates, emotionCandidates: [], stage: "quick-candidates" };
    case "TOGGLE_QUICK_CANDIDATE":
      return {
        ...state,
        quickCandidateResponse: undefined,
        emotionCandidates: state.emotionCandidates.some((item) => item.label === action.label)
          ? state.emotionCandidates.filter((item) => item.label !== action.label)
          : [...state.emotionCandidates, { label: action.label, source: "suggested" }],
      };
    case "SET_QUICK_CANDIDATE_RESPONSE":
      // Stays on the candidate step so the user can still end here or go deeper.
      return { ...state, quickCandidateResponse: action.response, emotionCandidates: [] };
    case "OPEN_GRANULARITY":
      return { ...state, stage: "granularity" };
    case "CHOOSE_GRANULARITY":
      return { ...state, quickConcept: action.concept, stage: "context-contrast" };
    case "SKIP_GRANULARITY":
      // Never pick a concept on the user's behalf; record the answer and move on.
      return {
        ...state,
        quickGranularityResponse: "unsure",
        quickConcept: undefined,
        stage: "quick-summary",
        status: "completed",
        completedAt: new Date().toISOString(),
      };
    case "SET_CONTRAST":
      return { ...state, quickContrastAnswer: action.answer, stage: "micro-learning" };
    case "DISMISS_MICRO_LEARNING":
      return { ...state, quickMicroLearningSeen: true, stage: "quick-summary", status: "completed", completedAt: new Date().toISOString() };
    case "COMPLETE_QUICK":
      return { ...state, stage: "quick-summary", status: "completed", completedAt: new Date().toISOString() };
    case "SET_ENTRY":
      return {
        ...state,
        entryDecision: action.decision,
        stage: action.decision === "unsure" ? "entry-mini" : action.decision === "stop" ? "stopped" : "body",
        status: action.decision === "stop" ? "stopped" : "draft",
        stopReason: action.decision === "stop" ? "entry" : undefined,
      };
    case "SET_ENTRY_MINI":
      return action.helpful === "yes"
        ? { ...state, stage: "body" }
        : { ...state, stage: "stopped", status: "stopped", stopReason: "entry" };
    case "SET_BODY":
      return { ...state, body: action.body, stage: "affect" };
    case "SET_AFFECT":
      return { ...state, affect: action.affect, stage: "context" };
    case "SET_CONTEXT":
      return { ...state, context: action.context, stage: "meaning" };
    case "SET_CONCERNS":
      return { ...state, concerns: action.concerns, stage: "emotion" };
    case "SET_EMOTIONS":
      return { ...state, emotionCandidates: action.emotionCandidates, stage: "outcome" };
    case "SET_OUTCOME":
      return {
        ...state,
        outcome: action.outcome,
        stage: "summary",
        status: "completed",
        completedAt: new Date().toISOString(),
      };
    case "STOP":
      return { ...state, stage: "stopped", status: "stopped", stopReason: action.reason };
  }
};
