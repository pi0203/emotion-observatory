import type { AffectPoint, BodyObservation, EmotionSelection, EmotionSession, EntryDecision, Stage } from "./session-types";
import { getStorageKeys, loadCompleted, loadDraft, saveDraft } from "./storage";

const V1_DRAFT_KEY = "emotion-lab:draft:v1";
const V1_COMPLETED_KEY = "emotion-lab:completed:v1";
const V2_DRAFT_KEY = "emotion-lab:draft:v2";
const V2_COMPLETED_KEY = "emotion-lab:completed:v2";
const V3_DRAFT_KEY = "emotion-lab:draft:v3";
const V3_COMPLETED_KEY = "emotion-lab:completed:v3";

/** v1 and v2 both stored affect as one of five steps. */
type ScaleStep = 1 | 2 | 3 | 4 | 5;
type SteppedAffect = { valence?: ScaleStep; activation?: ScaleStep; unknown?: boolean };

/** v2 records are v3-shaped apart from the affect axis. */
type V2Session = Omit<EmotionSession, "quickCheck" | "deepReflection"> & {
  quickCheck?: Omit<NonNullable<EmotionSession["quickCheck"]>, "affect"> & { affect?: SteppedAffect };
  deepReflection?: Omit<NonNullable<EmotionSession["deepReflection"]>, "affect"> & { affect?: SteppedAffect };
};

/** (n - 1) / 4 puts a recorded step at exactly the same place on the continuous axis. */
const toContinuous = (step?: number) => (step === undefined ? undefined : (step - 1) / 4);

const migrateAffect = (affect?: SteppedAffect): AffectPoint | undefined => {
  if (!affect) return undefined;
  if (affect.unknown) return { unknown: true };
  return { valence: toContinuous(affect.valence), activation: toContinuous(affect.activation) };
};

/** v3 stored need ids under `chosen`, and the coach screens were renamed. */
type V3Session = Omit<EmotionSession, "stage" | "support"> & {
  stage?: Stage | "granularity" | "context-contrast" | "micro-learning";
  support?: { chosen?: string[]; note?: string };
};

const RENAMED_NEEDS: Record<string, string> = { "settle-body": "pace", "put-in-words": "express" };
const RENAMED_STAGES: Record<string, Stage> = {
  granularity: "coach-appraisal",
  "context-contrast": "coach-words",
  "micro-learning": "coach-note",
};

/**
 * v3 -> v4. `support.chosen` held the direction the user picked, which the new
 * shape reads as responses inside a direction, so it is moved to `need` rather
 * than left to mean the wrong thing.
 */
export const migrateV3Session = (session: V3Session): EmotionSession => {
  const stage = (session.stage && RENAMED_STAGES[session.stage]) ?? (session.stage as Stage) ?? "landing";
  const first = session.support?.chosen?.[0];
  const support = session.support
    ? { need: first ? RENAMED_NEEDS[first] ?? first : undefined, chosen: [], note: session.support.note }
    : undefined;
  return { ...session, stage, support };
};

/** v2 -> v3: only the affect axis changes. */
export const migrateV2Session = (session: V2Session): EmotionSession => ({
  ...session,
  quickCheck: session.quickCheck ? { ...session.quickCheck, affect: migrateAffect(session.quickCheck.affect) } : undefined,
  deepReflection: session.deepReflection ? { ...session.deepReflection, affect: migrateAffect(session.deepReflection.affect) } : undefined,
});

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
  affect?: SteppedAffect;
  context?: { eventText?: string; source?: "event" | "memory" | "anticipation" | "thought" };
  concerns?: string[];
  emotionCandidates?: EmotionSelection[];
  quickCandidatePool?: EmotionSelection[];
  quickAffect?: SteppedAffect;
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

const migrateV1Shape = (legacy: LegacySession): V2Session => {
  const mode = legacy.mode ?? "deep";
  const wentDeep = mode !== "quick" && usedDeepReflection(legacy);
  const session: V2Session = {
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

/** v1 -> v3, chaining both steps so callers only ever see the current shape. */
export const migrateSession = (legacy: LegacySession): EmotionSession => migrateV3Session(migrateV2Session(migrateV1Shape(legacy)));

export const hasLegacyStorage = () => {
  if (typeof window === "undefined") return false;
  return [V1_COMPLETED_KEY, V1_DRAFT_KEY, V2_COMPLETED_KEY, V2_DRAFT_KEY, V3_COMPLETED_KEY, V3_DRAFT_KEY].some((key) => window.localStorage.getItem(key) !== null);
};

const readArray = <T>(key: string): T[] => {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Brings older stores up to the current one. v1 drafts are discarded, because a
 * v1 draft is unfinished by definition and its shape cannot be recovered
 * reliably; v2 drafts are carried over, because v2 -> v3 is lossless and the
 * user may have a session open right now. Deleting the old keys makes this
 * idempotent.
 */
export const migrateLegacyStorage = (): number => {
  if (typeof window === "undefined" || !hasLegacyStorage()) return 0;
  const { COMPLETED_KEY } = getStorageKeys();

  const fromV1 = readArray<LegacySession>(V1_COMPLETED_KEY).map(migrateSession);
  const fromV2 = readArray<V2Session>(V2_COMPLETED_KEY).map((item) => migrateV3Session(migrateV2Session(item)));
  const fromV3 = readArray<V3Session>(V3_COMPLETED_KEY).map(migrateV3Session);
  // older records go after whatever is already here, since the list is newest-first
  const migrated = [...fromV3, ...fromV2, ...fromV1];
  if (migrated.length) {
    window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([...loadCompleted(), ...migrated]));
  }

  let movedDraft = 0;
  const v2Draft = window.localStorage.getItem(V2_DRAFT_KEY);
  const v3Draft = window.localStorage.getItem(V3_DRAFT_KEY);
  if ((v2Draft || v3Draft) && !loadDraft()) {
    try {
      saveDraft(v3Draft
        ? migrateV3Session(JSON.parse(v3Draft) as V3Session)
        : migrateV3Session(migrateV2Session(JSON.parse(v2Draft!) as V2Session)));
      movedDraft = 1;
    } catch {
      movedDraft = 0;
    }
  }

  for (const key of [V1_COMPLETED_KEY, V1_DRAFT_KEY, V2_COMPLETED_KEY, V2_DRAFT_KEY, V3_COMPLETED_KEY, V3_DRAFT_KEY]) {
    window.localStorage.removeItem(key);
  }
  return migrated.length + movedDraft;
};

export const getLegacyStorageKeys = () => ({ V1_DRAFT_KEY, V1_COMPLETED_KEY, V2_DRAFT_KEY, V2_COMPLETED_KEY, V3_DRAFT_KEY, V3_COMPLETED_KEY });
