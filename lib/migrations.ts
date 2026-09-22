import type { BodyObservation, EmotionSelection, EmotionSession, EntryDecision, Stage } from "./session-types";
import { getStorageKeys, loadCompleted } from "./storage";

const V1_DRAFT_KEY = "emotion-lab:draft:v1";
const V1_COMPLETED_KEY = "emotion-lab:completed:v1";

/**
 * The v1 shape kept every field on one flat object, and `quickCandidatePool`
 * meant different things depending on `mode` — which is why v2 nests instead.
 */
type LegacySession = {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: "draft" | "completed" | "stopped";
  mode?: "quick" | "deep" | "quick-to-deep";
  stage?: Stage;
  entryDecision?: EntryDecision;
  body?: BodyObservation[];
  affect?: { valence?: 1 | 2 | 3 | 4 | 5; activation?: 1 | 2 | 3 | 4 | 5 };
  context?: { eventText?: string; source?: "event" | "memory" | "anticipation" | "thought" };
  concerns?: string[];
  emotionCandidates?: EmotionSelection[];
  quickCandidatePool?: EmotionSelection[];
  quickAffect?: { valence?: 1 | 2 | 3 | 4 | 5; activation?: 1 | 2 | 3 | 4 | 5; unknown?: boolean };
  quickCandidateResponse?: "none-close" | "unsure";
  quickConcept?: string;
  quickGranularityResponse?: "unsure";
  quickContrastAnswer?: string;
  quickMicroLearningSeen?: boolean;
  outcome?: NonNullable<EmotionSession["deepReflection"]>["outcome"];
  stopReason?: "user" | "entry";
};

const usedDeepReflection = (legacy: LegacySession) =>
  Boolean(
    legacy.body?.length ||
      legacy.affect ||
      legacy.context ||
      legacy.concerns?.length ||
      legacy.outcome ||
      (legacy.mode !== "quick" && legacy.emotionCandidates?.length),
  );

export const migrateSession = (legacy: LegacySession): EmotionSession => {
  const mode = legacy.mode ?? "deep";
  const wentDeep = mode !== "quick" && usedDeepReflection(legacy);
  const session: EmotionSession = {
    id: legacy.id,
    createdAt: legacy.createdAt,
    completedAt: legacy.completedAt,
    status: legacy.status,
    stage: legacy.stage ?? "landing",
    entry: mode === "deep" ? "deep" : "quick",
    stopReason: legacy.stopReason,
    migratedFromV1: true,
  };

  if (mode !== "deep") {
    session.quickCheck = {
      // In quick-to-deep records this field held the user's picks, not the offered
      // pool, so the original pool cannot be recovered.
      candidatePool: mode === "quick" ? legacy.quickCandidatePool ?? [] : [],
      selected: (mode === "quick" ? legacy.emotionCandidates : legacy.quickCandidatePool) ?? [],
      affect: legacy.quickAffect,
      candidateResponse: legacy.quickCandidateResponse,
      concept: legacy.quickConcept,
      granularityResponse: legacy.quickGranularityResponse,
      contrastAnswer: legacy.quickContrastAnswer,
      microLearningSeen: legacy.quickMicroLearningSeen,
      endedAt: legacy.completedAt,
    };
  }

  if (mode === "deep" || wentDeep) {
    session.deepReflection = {
      startedAt: legacy.createdAt,
      entryDecision: legacy.entryDecision,
      body: legacy.body ?? [],
      affect: legacy.affect,
      context: legacy.context,
      concerns: legacy.concerns ?? [],
      emotionCandidates: legacy.emotionCandidates ?? [],
      outcome: legacy.outcome,
    };
  }

  return session;
};

export const hasLegacyStorage = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(V1_COMPLETED_KEY) !== null || window.localStorage.getItem(V1_DRAFT_KEY) !== null;
};

/**
 * Moves v1 completed records into the v2 store and discards v1 drafts, which
 * are unfinished by definition. Deleting the v1 keys makes this idempotent.
 */
export const migrateLegacyStorage = (): number => {
  if (typeof window === "undefined" || !hasLegacyStorage()) return 0;
  const { COMPLETED_KEY } = getStorageKeys();
  const raw = window.localStorage.getItem(V1_COMPLETED_KEY);
  let migrated: EmotionSession[] = [];
  if (raw) {
    try {
      migrated = (JSON.parse(raw) as LegacySession[]).map(migrateSession);
    } catch {
      migrated = [];
    }
  }
  if (migrated.length) {
    // v1 records are older than anything already in v2, and the list is newest-first.
    window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([...loadCompleted(), ...migrated]));
  }
  window.localStorage.removeItem(V1_COMPLETED_KEY);
  window.localStorage.removeItem(V1_DRAFT_KEY);
  return migrated.length;
};

export const getLegacyStorageKeys = () => ({ V1_DRAFT_KEY, V1_COMPLETED_KEY });
