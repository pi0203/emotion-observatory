export type EntryDecision = "observe" | "unsure" | "stop";
export type SessionStatus = "draft" | "completed" | "stopped";
export type Stage =
  | "landing"
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
  outcome?: {
    clarity: "much_clearer" | "clearer" | "same" | "more_complex" | "more_distressed";
    usefulness: "helpful" | "unsure" | "unhelpful";
    note?: string;
  };
  stopReason?: "user" | "entry";
};

export type SessionAction =
  | { type: "START" }
  | { type: "RESUME"; session: EmotionSession }
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
  stage: "landing",
  body: [],
  concerns: [],
  emotionCandidates: [],
});

export const sessionReducer = (state: EmotionSession, action: SessionAction): EmotionSession => {
  switch (action.type) {
    case "START":
      return { ...createSession(), stage: "entry" };
    case "RESUME":
      return action.session;
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
