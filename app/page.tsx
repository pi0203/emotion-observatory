"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { canGoBack, createSession, sessionReducer, understandRoute } from "../lib/session-types";
import { appraisalEscapes, coachEscapes, coachResult, coachSetFor, getCoachSets } from "../lib/coach";
import type { AffectPoint, BodyObservation, DeepReflection, EmotionSelection, EmotionSession, QuickNonSelection, SynthesisFit } from "../lib/session-types";

type DeepContext = NonNullable<DeepReflection["context"]>;
type DeepOutcome = NonNullable<DeepReflection["outcome"]>;
import { getStorageAdapter } from "../lib/storage-adapter";
import { applyImport, buildExport, downloadExport, exportFileName, MAX_IMPORT_BYTES, parseImport, planImport, readFileText, type ImportError, type ImportPlan } from "../lib/record-transfer";
import { formatWhen, helpedOptions, summarise, triedOptions } from "../lib/records";
import { migrateLegacyStorage } from "../lib/migrations";
import { expandCandidates, filterQuickCandidates } from "../lib/quick-check";
import { activationLabel, quickActivation, quickValence, scaleLabel } from "../lib/affect-labels";
import { buildSynthesis, hasSynthesis } from "../lib/synthesis";
import { requireContent, type LocaleContent } from "../lib/content";
import { DEFAULT_LOCALE } from "../lib/i18n/locale";
import { I18nProvider, renderRich, useT } from "../lib/i18n/react";
import type { Translate } from "../lib/i18n/t";

// Every read and write of a record goes through the one storage seam. It is
// synchronous, like the localStorage calls it wraps, so no call site changes.
const { clearAll, dropCompleted, loadCompleted, loadDraft, persistSession, removeDraft, saveCompleted } = getStorageAdapter();

const progress: Record<string, string> = {
  body: "1 / 6",
  affect: "2 / 6",
  context: "3 / 6",
  meaning: "4 / 6",
  emotion: "5 / 6",
  outcome: "6 / 6",
};

/** The choices the screens offer, in the language being shown. */
const useContent = (): LocaleContent => requireContent(useT().locale);

/**
 * The app speaks Korean, its default language. Every screen below reads its
 * words from the messages (lib/i18n) and its choices from the content
 * (lib/content.ts), so another language can be added without touching them.
 */
export default function Home() {
  return <I18nProvider locale={DEFAULT_LOCALE}><App /></I18nProvider>;
}

function App() {
  const t = useT();
  const [session, dispatch] = useReducer(sessionReducer, undefined, createSession);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<EmotionSession | null>(null);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [records, setRecords] = useState<EmotionSession[] | null>(null);
  const [openRecord, setOpenRecord] = useState<EmotionSession | null>(null);

  const showRecords = () => { setRecords(loadCompleted()); setOpenRecord(null); };
  const saveFollowUp = (session: EmotionSession, followUp: NonNullable<NonNullable<EmotionSession["support"]>["followUp"]>) => {
    // written straight to the completed store, which upserts by id; the reducer
    // session is on the landing screen here, so nothing can clobber it
    const next = { ...session, support: { ...(session.support ?? { chosen: [] }), followUp: { ...session.support?.followUp, ...followUp, at: new Date().toISOString() } } };
    saveCompleted(next);
    setOpenRecord(next);
    setRecords(loadCompleted());
  };

  useEffect(() => {
    migrateLegacyStorage();
    const existing = loadDraft();
    setDraft(existing);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || session.stage === "landing") return;
    persistSession(session);
  }, [hydrated, session]);

  // keep the browser's back button in step with the app's, so neither surprises the other
  const depth = session.history?.length ?? 0;
  const lastDepth = useRef(0);
  useEffect(() => {
    if (!hydrated) return;
    if (depth > lastDepth.current) window.history.pushState({ depth }, "");
    lastDepth.current = depth;
  }, [hydrated, depth]);
  useEffect(() => {
    const onPop = () => dispatch({ type: "BACK" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const resume = () => {
    if (draft) dispatch({ type: "RESUME", session: draft });
  };

  if (session.stage === "landing") {
    if (openRecord) return <RecordDetail session={openRecord} onFollowUp={(followUp) => saveFollowUp(openRecord, followUp)} onBack={() => setOpenRecord(null)} />;
    if (records) return <RecordsScreen records={records} onOpen={setOpenRecord} onBack={() => setRecords(null)} onChanged={() => { setRecords(loadCompleted()); setDraft(loadDraft()); }} />;
    return <LandingScreen onQuick={() => dispatch({ type: "START_QUICK", locale: t.locale })} onDeep={() => dispatch({ type: "START_DEEP", locale: t.locale })} draft={draft} onResume={resume} onRecords={showRecords} />;
  }

  const stop = () => {
    dispatch({ type: "STOP", reason: "user" });
    setStopConfirm(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#" onClick={() => window.location.reload()}>
          {t("common.appName")}
        </a>
        <div className="topbar-actions">
          {canGoBack(session) && <button className="text-button" onClick={() => dispatch({ type: "BACK" })}>{t("common.stepBack")}</button>}
          {session.stage !== "entry" && session.stage !== "stopped" && session.stage !== "summary" && session.stage !== "quick-summary" && session.stage !== "support" && (
            <button className="text-button" onClick={() => setStopConfirm(true)}>{t("common.stop")}</button>
          )}
        </div>
      </header>

      {progress[session.stage] && (
        <div className="progress-row" aria-label={t("common.progress", { step: progress[session.stage] })}>
          <span>{progress[session.stage]}</span>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(Object.keys(progress).indexOf(session.stage) + 1) * 16.66}%` }} /></div>
        </div>
      )}

      {session.stage === "quick-affect" && <QuickAffectScreen onNext={(affect) => { dispatch({ type: "SET_QUICK_AFFECT", affect }); dispatch({ type: "SET_QUICK_CANDIDATES", candidatePool: filterQuickCandidates({ x: affect.valence ?? 0.5, y: affect.activation ?? 0.5 }, undefined, t.locale) }); }} onUnknown={() => dispatch({ type: "SET_QUICK_UNKNOWN" })} />}
      {session.stage === "quick-candidates" && <QuickCandidatesScreen pool={session.quickCheck?.candidatePool ?? []} selected={session.quickCheck?.selected ?? []} response={session.quickCheck?.candidateResponse} onToggle={(label) => dispatch({ type: "TOGGLE_QUICK_CANDIDATE", label })} onRespond={(response) => dispatch({ type: "SET_QUICK_CANDIDATE_RESPONSE", response })} onAddCustom={(label) => dispatch({ type: "ADD_QUICK_CUSTOM", label })} onMeaning={(label, meaning) => dispatch({ type: "SET_PERSONAL_MEANING", label, meaning })} onFinish={() => dispatch({ type: "COMPLETE_QUICK" })} onCoach={() => dispatch({ type: "OPEN_GRANULARITY" })} onDeep={() => { dispatch({ type: "COMPLETE_QUICK" }); dispatch({ type: "ENTER_DEEP" }); }} />}
      {session.stage === "coach-appraisal" && <CoachAppraisalScreen session={session} onToggle={(id) => dispatch({ type: "TOGGLE_APPRAISAL", id })} onOwn={(label) => dispatch({ type: "SET_OWN_APPRAISAL", label })} onNext={() => dispatch({ type: "GO_TO_COACH_WORDS" })} onLeave={() => dispatch({ type: "CLOSE_COACH" })} />}
      {session.stage === "coach-words" && <CoachWordsScreen session={session} onToggle={(label) => dispatch({ type: "TOGGLE_COACH_WORD", label })} onOwnWord={(label) => dispatch({ type: "SET_COACH_OWN_WORD", label })} onNext={() => dispatch({ type: "FINISH_COACH" })} onLeave={() => dispatch({ type: "CLOSE_COACH" })} />}
      {session.stage === "coach-note" && <CoachNoteScreen session={session} onDone={() => dispatch({ type: "CLOSE_COACH" })} />}
      {session.stage === "quick-summary" && <QuickSummaryScreen session={session} onDeep={() => dispatch({ type: "ENTER_DEEP" })} onFeedback={(feedback) => dispatch({ type: "SET_SYNTHESIS_FEEDBACK", ...feedback })} onSupport={() => dispatch({ type: "OPEN_SUPPORT" })} />}
      {session.stage === "entry" && (
        <EntryScreen draft={draft} onStart={() => dispatch({ type: "SET_ENTRY", decision: "observe" })} onUnsure={() => dispatch({ type: "SET_ENTRY", decision: "unsure" })} onStop={() => dispatch({ type: "SET_ENTRY", decision: "stop" })} onResume={resume} />
      )}
      {session.stage === "entry-mini" && <EntryMini onAnswer={(helpful) => dispatch({ type: "SET_ENTRY_MINI", helpful })} />}
      {session.stage === "body" && <BodyScreen initial={session.deepReflection?.body ?? []} onNext={(body) => dispatch({ type: "SET_BODY", body })} />}
      {session.stage === "affect" && <AffectScreen initial={session.deepReflection?.affect ?? quickAffectSuggestion(session)} onNext={(affect) => dispatch({ type: "SET_AFFECT", affect })} />}
      {session.stage === "context" && <ContextScreen initial={session.deepReflection?.context} onNext={(context) => dispatch({ type: "SET_CONTEXT", context })} />}
      {session.stage === "meaning" && <MeaningScreen initial={session.deepReflection?.concerns ?? []} onNext={(selected) => dispatch({ type: "SET_CONCERNS", concerns: selected })} />}
      {session.stage === "emotion" && <EmotionScreen initial={session.deepReflection?.emotionCandidates ?? []} affect={session.deepReflection?.affect} onNext={(selected) => dispatch({ type: "SET_EMOTIONS", emotionCandidates: selected })} />}
      {session.stage === "outcome" && <OutcomeScreen onNext={(outcome) => dispatch({ type: "SET_OUTCOME", outcome })} />}
      {session.stage === "summary" && <SummaryScreen session={session} onFeedback={(feedback) => dispatch({ type: "SET_SYNTHESIS_FEEDBACK", ...feedback })} onSupport={() => dispatch({ type: "OPEN_SUPPORT" })} />}
      {session.stage === "support" && <NeedScreen session={session} onNeed={(id) => dispatch({ type: "CHOOSE_NEED", id })} onResponse={(id) => dispatch({ type: "TOGGLE_RESPONSE", id })} onDeep={() => dispatch({ type: "ENTER_DEEP" })} onCoach={() => dispatch({ type: "OPEN_COACH" })} onBack={() => dispatch({ type: "BACK" })} />}
      {session.stage === "stopped" && <StoppedScreen session={session} />}

      {stopConfirm && <StopModal onClose={() => setStopConfirm(false)} onStop={stop} />}
    </main>
  );
}

function EntryScreen({ draft, onStart, onUnsure, onStop, onResume }: { draft: EmotionSession | null; onStart: () => void; onUnsure: () => void; onStop: () => void; onResume: () => void }) {
  const t = useT();
  return <Screen className="entry-screen">
    <p className="eyebrow">{t("common.appName")}</p>
    <h1>{renderRich(t("entry.title"))}</h1>
    <p className="lede">{renderRich(t("entry.lede"))}</p>
    <div className="stack-actions">
      <button className="primary-button" onClick={onStart}>{t("entry.observe")} <span>→</span></button>
      <button className="secondary-button" onClick={onUnsure}>{t("entry.unsure")}</button>
      <button className="quiet-button" onClick={onStop}>{t("entry.stop")}</button>
    </div>
    {draft && <div className="resume-card"><div><strong>{t("entry.resumeTitle")}</strong><span>{t("entry.resumeBody")}</span></div><button className="small-button" onClick={onResume}>{t("entry.resume")}</button></div>}
  </Screen>;
}

function LandingScreen({ onQuick, onDeep, draft, onResume, onRecords }: { onQuick: () => void; onDeep: () => void; draft: EmotionSession | null; onResume: () => void; onRecords: () => void }) {
  const t = useT();
  return <Screen className="entry-screen"><p className="eyebrow">{t("common.appName")}</p><h1>{renderRich(t("landing.title"))}</h1><p className="lede">{renderRich(t("landing.lede"))}</p><WhyThis /><WhyWords /><div className="stack-actions"><button className="primary-button" onClick={onQuick}>{t("landing.quick")} <span>→</span></button><button className="secondary-button" onClick={onDeep}>{t("landing.deep")}</button>{draft && <button className="secondary-button" onClick={onResume}>{t("landing.resume")}</button>}<button className="secondary-button" onClick={onRecords}>{t("landing.records")}</button></div><p className="small-note">{t("landing.storageNote")}</p></Screen>;
}

/**
 * One instrument for both passes. The position is continuous and is never shown
 * as a number; Quick and Deep differ only in the question above it, so the two
 * readings can be compared at the end.
 */
function AffectPad({ initial, onChange }: { initial?: AffectPoint; onChange: (point: { valence: number; activation: number }) => void }) {
  const t = useT();
  const [point, setPoint] = useState<{ x: number; y: number } | null>(
    initial && !initial.unknown && initial.valence !== undefined && initial.activation !== undefined
      ? { x: initial.valence, y: initial.activation }
      : null,
  );
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const move = (next: { x: number; y: number }) => {
    const picked = { x: clamp(next.x), y: clamp(next.y) };
    setPoint(picked);
    onChange({ valence: picked.x, activation: picked.y });
  };
  const fromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    move({ x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height });
  };
  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 0.05;
    const from = point ?? { x: 0.5, y: 0.5 };
    const by: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
    };
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); move(from); return; }
    const delta = by[event.key];
    if (!delta) return;
    event.preventDefault();
    move({ x: from.x + delta.x, y: from.y + delta.y });
  };
  return <div className="affect-grid-wrap">
    <div className="affect-axis-label top">{t("affectPad.top")}</div>
    <div className="affect-grid" role="application" tabIndex={0} aria-label={t("affectPad.ariaLabel")} onPointerDown={fromPointer} onKeyDown={nudge}>
      {point && <span className="affect-dot" style={{ left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }} />}
    </div>
    <div className="affect-axis-row"><span>{t("affectPad.left")}</span><span>{t("affectPad.right")}</span></div>
    <div className="affect-axis-label bottom">{t("affectPad.bottom")}</div>
  </div>;
}

function WhyThis() {
  const t = useT();
  return <details className="why">
    <summary>{t("whyThis.summary")}</summary>
    <div className="why-body">
      <p>{t("whyThis.enough")}</p>
      <p>{t("whyThis.distinguish")}</p>
      <p>{renderRich(t("whyThis.research"))}</p>
      <p className="why-principle">{renderRich(t("whyThis.principle"))}</p>
    </div>
  </details>;
}

function QuickAffectScreen({ onNext, onUnknown }: { onNext: (affect: AffectPoint) => void; onUnknown: () => void }) {
  const t = useT();
  const [point, setPoint] = useState<{ valence: number; activation: number } | null>(null);
  return <Screen>
    <StepHeading step={t("quickAffect.step")} title={t("quickAffect.title")} hint={t("quickAffect.hint")} />
    <AffectPad onChange={setPoint} />
    <div className="quick-actions">
      <button className="quiet-button" onClick={onUnknown}>{t("common.unsure")}</button>
      <button className="primary-button" disabled={!point} onClick={() => point && onNext(point)}>{t("common.next")} <span>→</span></button>
    </div>
  </Screen>;
}

function TieredWords({ pool, selectedLabels, ownWords, onToggle, onAddCustom, meanings, onMeaning }: { pool: EmotionSelection[]; selectedLabels: string[]; ownWords: string[]; onToggle: (label: string) => void; onAddCustom: (label: string) => void; meanings?: Record<string, string>; onMeaning?: (label: string, meaning: string) => void }) {
  const t = useT();
  const [tier, setTier] = useState<1 | 2>(1);
  const [custom, setCustom] = useState("");
  const poolLabels = pool.map((item) => item.label);
  const selectedAsItems = selectedLabels.map((label) => ({ label, source: "suggested" as const }));
  const expanded = expandCandidates([...pool, ...selectedAsItems], undefined, t.locale).filter((item) => !poolLabels.includes(item.label));
  const chip = (label: string) => <button className={`chip ${selectedLabels.includes(label) ? "selected" : ""}`} key={label} onClick={() => onToggle(label)}>{label}</button>;
  const addCustom = () => { onAddCustom(custom); setCustom(""); };

  return <>
    <div className="chip-grid">{pool.map((item) => chip(item.label))}</div>

    {tier === 1 && expanded.length > 0 && <button className="reveal-button" onClick={() => setTier(2)}>{t("words.more")}</button>}
    {tier >= 2 && expanded.length > 0 && <>
      <p className="tier-label">{t("words.similar")}</p>
      <div className="chip-grid">{expanded.map((item) => chip(item.label))}</div>
    </>}

    {ownWords.length > 0 && <>
      <p className="tier-label">{t("words.mine")}</p>
      <div className="chip-grid">{ownWords.map((label) => chip(label))}</div>
      {onMeaning && ownWords.map((label) => <div className="own-meaning" key={label}>
        <label className="field-label" htmlFor={`meaning-${label}`}>{t("words.meaningLabel", { label })} <em>{t("words.optional")}</em></label>
        <input id={`meaning-${label}`} className="text-input" defaultValue={meanings?.[label] ?? ""} onChange={(event) => onMeaning(label, event.target.value)} placeholder={t("words.meaningPlaceholder")} />
      </div>)}
    </>}

    <div className="own-word-block">
      <p className="tier-label">{t("words.notListed")}</p>
      <div className="own-word-row">
        <input className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustom(); }} placeholder={t("common.ownWordsPlaceholder")} aria-label={t("common.ownWordsPlaceholder")} />
        <button className="small-button" disabled={!custom.trim()} onClick={addCustom}>{t("words.add")}</button>
      </div>
      <p className="small-note">{t("words.startingPoint")}</p>
    </div>
  </>;
}

function QuickCandidatesScreen({ pool, selected, response, onToggle, onRespond, onAddCustom, onMeaning, onFinish, onCoach, onDeep }: { pool: EmotionSelection[]; selected: EmotionSelection[]; response?: QuickNonSelection; onToggle: (label: string) => void; onRespond: (response: QuickNonSelection) => void; onAddCustom: (label: string) => void; onMeaning: (label: string, meaning: string) => void; onFinish: () => void; onCoach: () => void; onDeep: () => void }) {
  const t = useT();
  const canCoach = getCoachSets(t.locale).some((set) => selected.some((item) => set.words.includes(item.label)));
  return <Screen>
    <StepHeading step={t("quickCandidates.step")} title={t("quickCandidates.title")} hint={t("quickCandidates.hint")} />
    <div className="provisional-note">{t("common.provisionalNote")}</div>
    <TieredWords pool={pool} selectedLabels={selected.map((item) => item.label)} ownWords={selected.filter((item) => item.source === "custom").map((item) => item.label)} onToggle={onToggle} onAddCustom={onAddCustom} meanings={Object.fromEntries(selected.filter((item) => item.personalMeaning).map((item) => [item.label, item.personalMeaning!]))} onMeaning={onMeaning} />

    <div className="quick-option-row">{(["none-close", "unsure"] as const).map((value) => <button className={`secondary-button ${response === value ? "selected" : ""}`} aria-pressed={response === value} key={value} onClick={() => onRespond(value)}>{t(`quickCandidates.decline.${value}`)}</button>)}</div>
    {response && <p className="small-note">{t(`quickCandidates.declined.${response}`)}</p>}

    <div className="quick-bottom-actions">
      <button className="quiet-button" onClick={onFinish}>{t("quickCandidates.finish")}</button>
      {canCoach ? <button className="primary-button" onClick={onCoach}>{t("quickCandidates.coach")} <span>→</span></button> : <button className="secondary-button" onClick={onDeep}>{t("quickCandidates.deep")}</button>}
    </div>
    {canCoach && <p className="small-note">{t("quickCandidates.coachNote")}</p>}
  </Screen>;
}

/** Asks what mattered before showing any word, so no list reads as a set of right answers. */
/**
 * Sits beside WhyThis, both collapsed, so the buttons stay near the top. The
 * Barrett paragraph is set apart because it is one theoretical position rather
 * than a settled result — see docs/EMOTION_CULTURE.md.
 */
function WhyWords() {
  const t = useT();
  return <details className="why">
    <summary>{t("whyWords.summary")}</summary>
    <div className="why-body">
      <p>{t("whyWords.shaped")}</p>
      <p>{renderRich(t("whyWords.notJudging"))}</p>
      <p className="why-principle">{renderRich(t("whyWords.principle"))}</p>
      <details className="why-deeper">
        <summary>{t("whyWords.deeperSummary")}</summary>
        <p>{t("whyWords.deeperReal")}</p>
        <p>{t("whyWords.deeperMoney")}</p>
        <p>{renderRich(t("whyWords.deeperOpen"))}</p>
      </details>
    </div>
  </details>;
}

/**
 * The coach is practice on a written example, so every screen says so up front,
 * outside any disclosure: the user's own moment is not what is being recorded.
 */
function ExampleNotice() {
  const t = useT();
  return <p className="example-notice" role="note">{renderRich(t("coach.notice"))}</p>;
}

/**
 * Putting the example down is not stopping the record: it returns to the
 * summary the user came from, and 그만하기 in the top bar stays for stopping.
 */
function CoachNavigation({ onNext, onLeave }: { onNext: () => void; onLeave: () => void }) {
  const t = useT();
  return <div className="navigation"><button className="quiet-button coach-leave" onClick={onLeave}>{t("coach.leave")}</button><button className="primary-button" onClick={onNext}>{t("common.next")} <span>→</span></button></div>;
}

/**
 * The coach's three kinds of area — the example, what the user picks, and the
 * note about it — each look different. The role is carried by a real text
 * label and a different edge, never by colour alone. Coach screens only.
 */
function ExampleZone({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <section className="zone zone-example" aria-labelledby={id}><span className="zone-label" id={id}>{label}</span>{children}</section>;
}

function MineZone({ children }: { children: React.ReactNode }) {
  const t = useT();
  return <div className="zone zone-mine" role="group" aria-label={t("coach.mineZone")}>{children}</div>;
}

/** A selected choice carries a visible mark, so the state never rests on colour alone. */
function Mark({ on }: { on: boolean }) {
  return on ? <span className="choice-mark" aria-hidden="true">✓ </span> : null;
}

/** Asks what stands out in the example before showing any word, so no list reads as a set of right answers. */
function CoachAppraisalScreen({ session, onToggle, onOwn, onNext, onLeave }: { session: EmotionSession; onToggle: (id: string) => void; onOwn: (label: string) => void; onNext: () => void; onLeave: () => void }) {
  const t = useT();
  const set = coachSetFor(session);
  const [own, setOwn] = useState(session.coach?.ownAppraisal ?? "");
  const picked = session.coach?.appraisals ?? [];
  if (!set) return <Screen><StepHeading step={t("coach.step")} title={t("coach.noSetTitle")} hint={t("coach.noSetHint")} /></Screen>;
  return <Screen>
    <StepHeading step={t("coach.step")} title={set.question} hint={t("coach.appraisalHint")} />
    <ExampleNotice />
    <ExampleZone label={t("coach.exampleZone")} id="coach-example-appraisal">{set.event}</ExampleZone>
    <MineZone>
    <p className="small-note">{t("coach.appraisalPickNote")}</p>
    <div className="choice-list">{[...set.appraisals, ...appraisalEscapes(t.locale)].map((item) => <button className={picked.includes(item.id) ? "selected" : ""} aria-pressed={picked.includes(item.id)} key={item.id} onClick={() => onToggle(item.id)}><Mark on={picked.includes(item.id)} />{item.text}</button>)}</div>
    <label className="field-label" htmlFor="coach-own-appraisal">{t("coach.ownAppraisalLabel")}</label>
    <input id="coach-own-appraisal" className="text-input" value={own} onChange={(event) => { setOwn(event.target.value); onOwn(event.target.value); }} placeholder={t("coach.ownAppraisalPlaceholder")} />
    </MineZone>
    <CoachNavigation onNext={onNext} onLeave={onLeave} />
  </Screen>;
}

/**
 * Every offered word looks the same and sits in the same order whatever was
 * picked on the previous screen; nothing is pre-selected or suggested.
 */
function CoachWordsScreen({ session, onToggle, onOwnWord, onNext, onLeave }: { session: EmotionSession; onToggle: (label: string) => void; onOwnWord: (label: string) => void; onNext: () => void; onLeave: () => void }) {
  const t = useT();
  const set = coachSetFor(session);
  const [own, setOwn] = useState(session.coach?.ownWord ?? "");
  const picked = session.coach?.wordsAfter ?? [];
  const observations = coachResult(session)?.observations ?? [];
  return <Screen>
    <StepHeading step={t("coach.step")} title={t("coach.wordsTitle")} hint={t("coach.wordsHint")} />
    {set && <ExampleZone label={t("coach.exampleZone")} id="coach-example-words">{set.event}</ExampleZone>}
    <MineZone>
    {observations.length > 0 && <p className="zone-recap">{t("coach.recap", { observations: observations.join(" ") })}</p>}
    <div className="chip-grid" role="group" aria-label={t("coach.wordsGroup")}>{[...(set?.words ?? []), ...coachEscapes(t.locale)].map((label) => <button className={`chip ${picked.includes(label) ? "selected" : ""}`} aria-pressed={picked.includes(label)} key={label} onClick={() => onToggle(label)}><Mark on={picked.includes(label)} />{label}</button>)}</div>
    <label className="field-label" htmlFor="coach-own">{t("coach.ownWordLabel")}</label>
    <input id="coach-own" className="text-input" value={own} onChange={(event) => { setOwn(event.target.value); onOwnWord(event.target.value); }} placeholder={t("coach.ownWordPlaceholder")} />
    <p className="small-note">{t("coach.wordsPickNote")}</p>
    </MineZone>
    <CoachNavigation onNext={onNext} onLeave={onLeave} />
  </Screen>;
}

/**
 * Shows what was explored in the example, and only that. The user's own words
 * from before the coach are deliberately not put beside it: the two answer
 * different questions, so side by side they would read as a change in feeling.
 */
function CoachNoteScreen({ session, onDone }: { session: EmotionSession; onDone: () => void }) {
  const t = useT();
  const set = coachSetFor(session);
  const result = coachResult(session);
  const fromExample = result?.origin === "example-practice";
  return <Screen>
    <p className="eyebrow">{t("coach.noteEyebrow")}</p>
    <h1>{renderRich(t("coach.noteTitle"))}</h1>
    <aside className="zone zone-note" aria-label={t("coach.noteAside")}><p>{set?.note}</p></aside>
    {result && (() => {
      const rows = <>
        <SummaryRow label={fromExample ? t("coach.observationsFromExample") : t("coach.observationsUnknown")} value={result.observations.join(" ") || t("common.notChosen")} />
        <SummaryRow label={fromExample ? t("coach.expressionsFromExample") : t("coach.expressionsUnknown")} value={result.expressions.join(" · ") || t("common.notChosen")} />
      </>;
      // a record of unknown origin is not labelled an example after the fact
      return fromExample ? <ExampleZone label={t("coach.resultZone")} id="coach-example-result">{rows}</ExampleZone> : <div className="summary-card">{rows}</div>;
    })()}
    <p className="summary-footnote">{fromExample ? t("coach.footnoteFromExample") : t("coach.footnoteUnknown")}</p>
    <button className="primary-button" onClick={onDone}>{t("coach.backToSummary")}</button>
  </Screen>;
}

function QuickSummaryScreen({ session, onDeep, onFeedback, onSupport }: { session: EmotionSession; onDeep: () => void; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void; onSupport: () => void }) {
  const t = useT();
  const quick = session.quickCheck;
  const affect = quick?.affect?.unknown ? t("common.unsure") : `${quickValence(quick?.affect?.valence, t.locale)} · ${quickActivation(quick?.affect?.activation, t.locale)}`;
  const words = (quick?.selected ?? []).map((item) => item.label).join(" · ") || quickResponseLabel(t, quick?.candidateResponse) || t("common.notChosen");
  return <Screen><p className="eyebrow">{t("quickSummary.eyebrow")}</p><h1>{t("quickSummary.title")}</h1><div className="summary-card"><SummaryRow label={t("quickSummary.affect")} value={affect} /><SummaryRow label={t("quickSummary.words")} value={words} />{quick?.granularityResponse === "unsure" && <SummaryRow label={t("quickSummary.granularity")} value={t("common.unsure")} />}{quick?.contrastAnswer && <SummaryRow label={t("quickSummary.contrast")} value={quick.contrastAnswer} />}</div><p className="summary-footnote">{t("quickSummary.footnote")}</p><SynthesisSection session={session} onFeedback={onFeedback} /><div className="stack-actions"><button className="primary-button centered" onClick={onDeep}>{t("quickSummary.deep")} <span>→</span></button><button className="secondary-button" onClick={onSupport}>{t("quickSummary.support")}</button><a className="secondary-button centered" href="/">{t("common.backToStart")}</a></div></Screen>;
}

function EntryMini({ onAnswer }: { onAnswer: (answer: "yes" | "unsure" | "no") => void }) {
  const t = useT();
  return <Screen><p className="eyebrow">{t("entryMini.eyebrow")}</p><h1>{renderRich(t("entryMini.title"))}</h1><p className="lede">{t("entryMini.lede")}</p><div className="choice-list"><button onClick={() => onAnswer("yes")}>{t("entryMini.yes")}</button><button onClick={() => onAnswer("unsure")}>{t("entryMini.unsure")}</button><button onClick={() => onAnswer("no")}>{t("entryMini.no")}</button></div></Screen>;
}

function BodyScreen({ initial, onNext }: { initial: BodyObservation[]; onNext: (body: BodyObservation[]) => void }) {
  const t = useT();
  const { bodySignals, stepNotes } = useContent();
  const [selected, setSelected] = useState(initial.map((item) => item.label));
  const [custom, setCustom] = useState(initial.find((item) => item.custom)?.label ?? "");
  const [showAll, setShowAll] = useState(false);
  const toggle = (label: string) => setSelected((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  const chip = (label: string) => <button className={`chip ${selected.includes(label) ? "selected" : ""}`} key={label} onClick={() => toggle(label)}>{label}</button>;
  const items = bodySignals.items as { label: string; region: string; firstTier?: boolean }[];
  const first = items.filter((item) => item.firstTier);
  const rest = bodySignals.regions
    .map((region) => ({ region, labels: items.filter((item) => item.region === region && !item.firstTier).map((item) => item.label) }))
    .filter((group) => group.labels.length);

  return <Screen>
    <StepHeading step={t("body.step")} title={t("body.title")} hint={t("body.hint")} />
    <div className="chip-grid">{first.map((item) => chip(item.label))}</div>
    {!showAll && <button className="reveal-button" onClick={() => setShowAll(true)}>{t("body.more")}</button>}
    {showAll && rest.map((group) => <div key={group.region}>
      <p className="tier-label">{group.region}</p>
      <div className="chip-grid">{group.labels.map((label) => chip(label))}</div>
    </div>)}
    <label className="field-label" htmlFor="body-custom">{t("body.customLabel")}</label>
    <input id="body-custom" className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder={t("body.customPlaceholder")} />
    <Navigation
      note={stepNote(stepNotes, "body", selected.length > 0 || custom.trim().length > 0)}
      onNext={() => onNext([...selected.filter((label) => label !== custom).map((label) => ({ label })), ...(custom.trim() ? [{ label: custom.trim(), custom: true }] : [])])}
    />
  </Screen>;
}

function AffectScreen({ initial, onNext }: { initial?: AffectPoint; onNext: (affect: AffectPoint) => void }) {
  const t = useT();
  const { stepNotes } = useContent();
  const [point, setPoint] = useState<{ valence: number; activation: number } | null>(
    initial && !initial.unknown && initial.valence !== undefined && initial.activation !== undefined
      ? { valence: initial.valence, activation: initial.activation }
      : null,
  );
  const [touched, setTouched] = useState(false);
  return <Screen>
    <StepHeading step={t("affect.step")} title={t("affect.title")} hint={t("affect.hint")} />
    <AffectPad initial={initial} onChange={(next) => { setTouched(true); setPoint(next); }} />
    <Navigation note={stepNote(stepNotes, "affect", touched)} onNext={() => onNext(point ?? initial ?? {})} />
  </Screen>;
}

function ContextScreen({ initial, onNext }: { initial?: DeepContext; onNext: (context: DeepContext) => void }) {
  const t = useT();
  const { stepNotes } = useContent();
  const [text, setText] = useState(initial?.eventText ?? "");
  const [source, setSource] = useState<DeepContext["source"]>(initial?.source ?? "event");
  return <Screen><StepHeading step={t("context.step")} title={t("context.title")} hint={t("context.hint")} /><textarea className="text-area" value={text} onChange={(event) => setText(event.target.value)} placeholder={t("context.placeholder")} /><div className="segmented"><span>{t("context.sourceQuestion")}</span>{(["event", "memory", "anticipation", "thought"] as const).map((value) => <button className={source === value ? "selected" : ""} key={value} onClick={() => setSource(value)}>{t(`contextSource.${value}`)}</button>)}</div><Navigation note={stepNote(stepNotes, "context", text.trim().length > 0)} onNext={() => onNext({ eventText: text, source })} /></Screen>;
}

function MeaningScreen({ initial, onNext }: { initial: string[]; onNext: (selected: string[]) => void }) {
  const t = useT();
  const { concerns, stepNotes } = useContent();
  const [selected, setSelected] = useState(initial);
  const [custom, setCustom] = useState("");
  const toggle = (item: string) => setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  return <Screen><StepHeading step={t("meaning.step")} title={t("meaning.title")} hint={t("meaning.hint")} /><div className="choice-list compact">{concerns.map((item) => <button className={selected.includes(item) ? "selected" : ""} key={item} onClick={() => toggle(item)}>{item}</button>)}</div><input className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder={t("common.ownWordsPlaceholder")} /><Navigation note={stepNote(stepNotes, "meaning", selected.length > 0 || custom.trim().length > 0)} onNext={() => onNext([...selected, ...(custom ? [custom] : [])])} /></Screen>;
}

function EmotionScreen({ initial, affect, onNext }: { initial: EmotionSelection[]; affect?: AffectPoint; onNext: (selected: EmotionSelection[]) => void }) {
  const t = useT();
  const { stepNotes } = useContent();
  const [selected, setSelected] = useState(initial.map((item) => item.label));
  const [ownWords, setOwnWords] = useState(initial.filter((item) => item.source === "custom").map((item) => item.label));
  const toggle = (label: string) => setSelected((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  const addOwnWord = (label: string) => {
    const word = label.trim();
    if (!word || ownWords.includes(word)) return;
    setOwnWords((current) => [...current, word]);
    setSelected((current) => current.includes(word) ? current : [...current, word]);
  };
  // the deep affect already narrowed the space once; this reuses it rather than listing everything
  const pool = filterQuickCandidates({ x: affect?.valence ?? 0.5, y: affect?.activation ?? 0.5 }, undefined, t.locale);
  return <Screen>
    <StepHeading step={t("emotion.step")} title={t("emotion.title")} hint={t("emotion.hint")} />
    <div className="provisional-note">{t("common.provisionalNote")}</div>
    <TieredWords pool={pool} selectedLabels={selected} ownWords={ownWords} onToggle={toggle} onAddCustom={addOwnWord} />
    <div className="quick-option-row">{[t("emotion.escapes.several"), t("emotion.escapes.unsure")].map((label) => <button className={`secondary-button ${selected.includes(label) ? "selected" : ""}`} aria-pressed={selected.includes(label)} key={label} onClick={() => toggle(label)}>{label}</button>)}</div>
    <Navigation note={stepNote(stepNotes, "emotion", selected.length > 0)} onNext={() => onNext(selected.map((label) => ({ label, source: ownWords.includes(label) ? "custom" as const : "suggested" as const })))} />
  </Screen>;
}

function OutcomeScreen({ onNext }: { onNext: (outcome: DeepOutcome) => void }) {
  const t = useT();
  const [clarity, setClarity] = useState<DeepOutcome["clarity"]>();
  const [usefulness, setUsefulness] = useState<DeepOutcome["usefulness"]>();
  const [note, setNote] = useState("");
  return <Screen><StepHeading step={t("outcome.step")} title={t("outcome.title")} hint={t("outcome.hint")} /><div className="choice-list compact">{(["much_clearer", "clearer", "same", "more_complex", "more_distressed"] as const).map((value) => <button className={clarity === value ? "selected" : ""} key={value} onClick={() => setClarity(value)}>{t(`outcome.clarity.${value}`)}</button>)}</div><h2 className="subquestion">{t("outcome.usefulnessQuestion")}</h2><div className="inline-choices">{(["helpful", "unsure", "unhelpful"] as const).map((value) => <button className={usefulness === value ? "selected" : ""} key={value} onClick={() => setUsefulness(value)}>{t(`outcome.usefulness.${value}`)}</button>)}</div><input className="text-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("outcome.notePlaceholder")} /><Navigation disabled={!clarity || !usefulness} onNext={() => onNext({ clarity: clarity!, usefulness: usefulness!, note })} /></Screen>;
}

function SummaryScreen({ session, onFeedback, onSupport }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void; onSupport: () => void }) {
  const t = useT();
  const deep = session.deepReflection;
  const quickAffect = session.quickCheck?.affect;
  return <Screen><p className="eyebrow">{t("summary.eyebrow")}</p><h1>{t("summary.title")}</h1><div className="summary-card">{quickAffect && <SummaryRow label={t("summary.quickAffect")} value={quickAffect.unknown ? t("common.unsure") : `${quickValence(quickAffect.valence, t.locale)} · ${quickActivation(quickAffect.activation, t.locale)}`} />}<SummaryRow label={t("summary.body")} value={(deep?.body ?? []).map((item) => item.label).join(" · ") || t("common.notRecorded")} /><SummaryRow label={t("summary.affect")} value={`${scaleLabel(deep?.affect?.valence, t.locale)} · ${activationLabel(deep?.affect?.activation, t.locale)}`} /><SummaryRow label={t("summary.context")} value={deep?.context?.eventText || t("common.notRecorded")} /><SummaryRow label={t("summary.concerns")} value={(deep?.concerns ?? []).join(" · ") || t("common.notRecorded")} /><SummaryRow label={t("summary.words")} value={(deep?.emotionCandidates ?? []).map((item) => item.label).join(" · ") || t("common.notRecorded")} /></div><p className="summary-footnote">{t("summary.footnote")}</p><SynthesisSection session={session} onFeedback={onFeedback} /><div className="stack-actions"><button className="primary-button centered" onClick={onSupport}>{t("summary.support")} <span>→</span></button><a className="secondary-button centered" href="/">{t("common.backToStart")}</a></div></Screen>;
}

function SynthesisSection({ session, onFeedback }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void }) {
  const t = useT();
  const synthesis = buildSynthesis(session, t.locale);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState(session.synthesisFeedback?.correction ?? "");
  const fit = session.synthesisFeedback?.fit;
  if (!hasSynthesis(synthesis)) return null;
  const block = (title: string, lines: { id: string; text: string }[]) =>
    lines.length ? <><p className="tier-label">{title}</p><ul className="synthesis-lines">{lines.map((line) => <li key={line.id}>{line.text}</li>)}</ul></> : null;

  return <section className="synthesis">
    <h2 className="synthesis-title">{renderRich(t("synthesisSection.title"))}</h2>
    <p className="synthesis-lead">{synthesis.lead}</p>

    {block(t("synthesisSection.observed"), synthesis.observed)}
    {block(t("synthesisSection.meaning"), synthesis.meaning)}
    {block(t("synthesisSection.unknown"), synthesis.unknown)}

    {synthesis.questions.length > 0 && <>
      <p className="tier-label">{t("synthesisSection.questions")}</p>
      <ul className="synthesis-questions">{synthesis.questions.map((question) => <li key={question}>{question}</li>)}</ul>
    </>}

    <p className="synthesis-caveat">{synthesis.caveat}</p>

    <p className="synthesis-question">{t("synthesisSection.fitQuestion")}</p>
    <div className="inline-choices">{(["close", "partly", "unsure"] as const).map((value) => <button className={fit === value ? "selected" : ""} aria-pressed={fit === value} key={value} onClick={() => onFeedback({ fit: value })}>{t(`synthesisSection.fit.${value}`)}</button>)}</div>

    {editing
      ? <div className="own-word-block">
          <textarea className="text-area" value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder={t("synthesisSection.correctionPlaceholder")} aria-label={t("synthesisSection.correct")} />
          <div className="quick-option-row">
            <button className="small-button" onClick={() => { onFeedback({ correction }); setEditing(false); }}>{t("synthesisSection.keep")}</button>
            <button className="quiet-button" onClick={() => { setCorrection(session.synthesisFeedback?.correction ?? ""); setEditing(false); }}>{t("synthesisSection.cancel")}</button>
          </div>
        </div>
      : <button className="quiet-button" onClick={() => setEditing(true)}>{t("synthesisSection.correct")}</button>}
    {!editing && session.synthesisFeedback?.correction && <p className="synthesis-correction">{t("common.quoted", { value: session.synthesisFeedback.correction })}</p>}
  </section>;
}

type NeedEntry = { id: string; label: string; group?: string; because?: string; route?: boolean; exit?: boolean; responses?: { id: string; label: string }[] };

/**
 * One screen, two levels. Picking a direction opens the things that can be done
 * in it, right below. Nothing is ranked, nothing is recommended, and switching
 * direction never discards what was picked under another one.
 */
function NeedScreen({ session, onNeed, onResponse, onDeep, onCoach, onBack }: { session: EmotionSession; onNeed: (id: string) => void; onResponse: (id: string) => void; onDeep: () => void; onCoach: () => void; onBack: () => void }) {
  const t = useT();
  const { needs: needsData } = useContent();
  const list = needsData.needs as NeedEntry[];
  const need = list.find((item) => item.id === session.support?.need);
  const picked = session.support?.choicesByNeed?.[need?.id ?? ""] ?? [];
  const route = understandRoute(session);
  return <Screen>
    <StepHeading step={t("need.step")} title={t("need.title")} hint={t("need.hint")} />
    {needsData.groups.map((group) => <div key={group}>
      <p className="tier-label">{group}</p>
      <div className="choice-list compact">{list.filter((item) => item.group === group).map((item) => <button className={need?.id === item.id ? "selected" : ""} aria-pressed={need?.id === item.id} key={item.id} onClick={() => onNeed(item.id)}>{item.label}</button>)}</div>
    </div>)}

    {need?.responses && <div className="response-block">
      <p className="tier-label">{need.label}</p>
      {need.because && <p className="step-note">{need.because}</p>}
      <div className="choice-list">{need.responses.map((option) => <button className={picked.includes(option.id) ? "selected" : ""} aria-pressed={picked.includes(option.id)} key={option.id} onClick={() => onResponse(option.id)}>{option.label}</button>)}</div>
    </div>}

    {need?.route && <div className="response-block">
      <p className="tier-label">{need.label}</p>
      <p className="step-note">{need.because}</p>
      {route === "deep" && <button className="primary-button centered" onClick={onDeep}>{t("need.routeDeep")} <span>→</span></button>}
      {route === "coach" && <button className="primary-button centered" onClick={onCoach}>{t("need.routeCoach")} <span>→</span></button>}
      {route === "none" && <p className="small-note">{t("need.routeNone")}</p>}
    </div>}

    {need?.exit && <p className="small-note">{t("need.exit")}</p>}

    <p className="small-note">{t("need.varies")}</p>
    <div className="navigation"><button className="quiet-button" onClick={onBack}>{t("need.backToSummary")}</button><a className="primary-button" href="/">{t("need.finish")} <span>→</span></a></div>
  </Screen>;
}

/** A list of what was recorded. No scores, no patterns across records, no interpretation. */
function RecordsScreen({ records, onOpen, onBack, onChanged }: { records: EmotionSession[]; onOpen: (session: EmotionSession) => void; onBack: () => void; onChanged: () => void }) {
  const t = useT();
  return <Screen className="entry-screen">
    <p className="eyebrow">{t("records.eyebrow")}</p>
    <h1>{t("records.title")}</h1>
    {records.length === 0
      ? <p className="lede">{t("records.empty")}</p>
      : <div className="record-list">{records.map((session) => {
          const item = summarise(session, t.locale);
          return <button className="record-row" key={item.id} onClick={() => onOpen(session)}>
            <span className="record-when">{formatWhen(item.at, t.locale)}<em>{item.depthLabel}</em></span>
            <strong>{item.words.join(" · ") || t("records.noWords")}</strong>
            {item.needLabel && <span className="record-need">{t("records.needLine", { label: item.needLabel })}</span>}
            {item.responseLabels.length > 0 && <span className="record-need">{t("records.responsesLine", { labels: item.responseLabels.join(" / ") })}</span>}
          </button>;
        })}</div>}
    <RecordTransfer count={records.length} onChanged={onChanged} />
    <div className="navigation"><button className="quiet-button" onClick={onBack}>{t("records.backToStart")}</button><span /></div>
  </Screen>;
}

type TransferNote = { kind: "status" | "alert"; text: string };

/**
 * Export, import and delete-all, at the foot of the records list. Everything
 * stays in the browser and goes through the storage adapter. Import always asks
 * first, never overwrites a record already here, and saves nothing from a file
 * it cannot read. Delete-all asks once more and says it cannot be undone.
 */
function RecordTransfer({ count, onChanged }: { count: number; onChanged: () => void }) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [note, setNote] = useState<TransferNote | null>(null);

  // the question takes the focus, so it is read before the choice is made
  useEffect(() => {
    if (plan || confirmingDelete) summary.current?.focus();
  }, [plan, confirmingDelete]);

  const refuse = (error: ImportError | "unreadable") => {
    setPlan(null);
    setNote({ kind: "alert", text: t(`recordTransfer.errors.${error}`) });
  };

  const exportAll = () => {
    const name = exportFileName();
    downloadExport(buildExport(loadCompleted()), name);
    setNote({ kind: "status", text: t("recordTransfer.exported", { name }) });
  };

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setConfirmingDelete(false);
    if (file.size > MAX_IMPORT_BYTES) return refuse("too-large");
    readFileText(file).then((text) => {
      const parsed = parseImport(text);
      if (!parsed.ok) return refuse(parsed.error);
      setNote(null);
      setPlan(planImport(parsed, loadCompleted()));
    }, () => refuse("unreadable"));
  };

  const confirmImport = () => {
    if (!plan) return;
    const added = applyImport(plan, getStorageAdapter());
    setNote({ kind: "status", text: t("recordTransfer.imported", { added, duplicates: plan.duplicates + (plan.add.length - added), invalid: plan.invalid }) });
    setPlan(null);
    onChanged();
  };

  const deleteAll = () => {
    clearAll();
    setConfirmingDelete(false);
    setNote({ kind: "status", text: t("recordTransfer.deletedAll") });
    onChanged();
  };

  return <section className="synthesis" aria-labelledby="record-transfer-title">
    <p className="tier-label" id="record-transfer-title">{t("recordTransfer.title")}</p>
    <p className="small-note">{t("recordTransfer.intro")}</p>

    <p className="synthesis-question">{t("recordTransfer.exportNote")}</p>
    <p className="small-note">{count > 0 ? t("recordTransfer.exportScope", { count }) : t("recordTransfer.exportEmpty")}</p>
    <div className="quick-option-row">
      <button className="secondary-button" disabled={count === 0} onClick={exportAll}>{t("recordTransfer.export")}</button>
      <button className="secondary-button" onClick={() => fileInput.current?.click()}>{t("recordTransfer.import")}</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label={t("recordTransfer.importFileLabel")} onChange={pickFile} />
    </div>

    {plan && <div role="group" aria-labelledby="record-import-summary">
      <p className="synthesis-question" id="record-import-summary" ref={summary} tabIndex={-1}>{t("recordTransfer.importSummary", { total: plan.total, duplicates: plan.duplicates, invalid: plan.invalid })}</p>
      {plan.add.length > 0
        ? <>
            <p className="small-note">{t("recordTransfer.importRule", { add: plan.add.length })}</p>
            <div className="quick-option-row">
              <button className="secondary-button" onClick={confirmImport}>{t("recordTransfer.importConfirm")}</button>
              <button className="quiet-button" onClick={() => { setPlan(null); setNote({ kind: "status", text: t("recordTransfer.importCancelled") }); }}>{t("recordTransfer.importCancel")}</button>
            </div>
          </>
        : <>
            <p className="small-note">{t("recordTransfer.importNothingNew")}</p>
            <div className="quick-option-row"><button className="quiet-button" onClick={() => setPlan(null)}>{t("recordTransfer.importCancel")}</button></div>
          </>}
    </div>}

    {!confirmingDelete
      ? <div className="quick-option-row"><button className="quiet-button" onClick={() => { setPlan(null); setNote(null); setConfirmingDelete(true); }}>{t("recordTransfer.deleteAll")}</button></div>
      : <div role="group" aria-labelledby="record-delete-title">
          <p className="synthesis-question" id="record-delete-title" ref={summary} tabIndex={-1}>{t("recordTransfer.deleteAllConfirmTitle")}</p>
          <p className="small-note">{t("recordTransfer.deleteAllConfirmBody")}</p>
          <div className="quick-option-row">
            <button className="secondary-button" onClick={deleteAll}>{t("recordTransfer.deleteAllConfirm")}</button>
            <button className="quiet-button" onClick={() => setConfirmingDelete(false)}>{t("recordTransfer.deleteAllCancel")}</button>
          </div>
        </div>}

    {note && <p className="step-note" role={note.kind}>{note.text}</p>}
  </section>;
}

function RecordDetail({ session, onFollowUp, onBack }: { session: EmotionSession; onFollowUp: (followUp: { tried?: "yes" | "partly" | "no"; helped?: "yes" | "somewhat" | "no" | "unsure" }) => void; onBack: () => void }) {
  const t = useT();
  const item = summarise(session, t.locale);
  const followUp = session.support?.followUp;
  const deep = session.deepReflection;
  return <Screen>
    <p className="eyebrow">{t("records.eyebrow")}</p>
    <h1>{formatWhen(item.at, t.locale)}</h1>
    <div className="summary-card">
      <SummaryRow label={t("recordDetail.depth")} value={item.depthLabel} />
      {session.quickCheck?.affect && <SummaryRow label={t("recordDetail.quickAffect")} value={session.quickCheck.affect.unknown ? t("common.unsure") : `${quickValence(session.quickCheck.affect.valence, t.locale)} · ${quickActivation(session.quickCheck.affect.activation, t.locale)}`} />}
      {deep?.affect && <SummaryRow label={t("recordDetail.deepAffect")} value={`${scaleLabel(deep.affect.valence, t.locale)} · ${activationLabel(deep.affect.activation, t.locale)}`} />}
      <SummaryRow label={t("recordDetail.words")} value={item.words.join(" · ") || t("common.notChosen")} />
      {item.personalMeanings.map((entry) => <SummaryRow key={entry.label} label={t("recordDetail.personalMeaning", { label: entry.label })} value={entry.meaning} />)}
      {deep?.context?.eventText && <SummaryRow label={t("recordDetail.context")} value={deep.context.eventText} />}
      {item.needLabel && <SummaryRow label={t("recordDetail.need")} value={item.needLabel} />}
      {item.responseLabels.length > 0 && <SummaryRow label={t("recordDetail.responses")} value={item.responseLabels.join(" / ")} />}
    </div>

    {item.canFollowUp && <section className="synthesis">
      <p className="tier-label">{t("recordDetail.followUpTitle")}</p>
      <p className="synthesis-question">{t("recordDetail.triedQuestion")}</p>
      <div className="inline-choices">{triedOptions(t.locale).map((option) => <button className={followUp?.tried === option.id ? "selected" : ""} aria-pressed={followUp?.tried === option.id} key={option.id} onClick={() => onFollowUp({ tried: option.id })}>{option.label}</button>)}</div>
      {(followUp?.tried === "yes" || followUp?.tried === "partly") && <>
        <p className="synthesis-question">{t("recordDetail.helpedQuestion")}</p>
        <div className="inline-choices">{helpedOptions(t.locale).map((option) => <button className={followUp?.helped === option.id ? "selected" : ""} aria-pressed={followUp?.helped === option.id} key={option.id} onClick={() => onFollowUp({ helped: option.id })}>{option.label}</button>)}</div>
      </>}
      <p className="synthesis-caveat">{t("recordDetail.followUpCaveat")}</p>
    </section>}

    <div className="navigation"><button className="quiet-button" onClick={onBack}>{t("recordDetail.backToList")}</button><a className="primary-button" href="/">{t("recordDetail.toStart")} <span>→</span></a></div>
  </Screen>;
}

function StoppedScreen({ session }: { session: EmotionSession }) { const t = useT(); return <Screen className="entry-screen"><p className="eyebrow">{t("stopped.eyebrow")}</p><h1>{renderRich(t("stopped.title"))}</h1><p className="lede">{t("stopped.lede")}</p><div className="stack-actions"><a className="primary-button centered" href="/">{t("stopped.home")}</a><button className="quiet-button" onClick={() => { removeDraft(); dropCompleted(session.id); window.location.reload(); }}>{t("stopped.delete")}</button></div>{session.stopReason === "entry" && <p className="small-note">{t("stopped.entryNote")}</p>}</Screen>; }

function StopModal({ onClose, onStop }: { onClose: () => void; onStop: () => void }) { const t = useT(); return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><p className="eyebrow">{t("stopModal.eyebrow")}</p><h2>{renderRich(t("stopModal.title"))}</h2><p>{t("stopModal.body")}</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>{t("stopModal.keepGoing")}</button><button className="primary-button" onClick={onStop}>{t("stopModal.stop")}</button></div></div></div>; }

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`screen ${className}`}>{children}</section>; }
function StepHeading({ step, title, hint }: { step: string; title: string; hint: string }) { return <><p className="eyebrow">{step}</p><h1>{title}</h1><p className="hint">{hint}</p></>; }
function Navigation({ onNext, disabled = false, note }: { onNext: () => void; disabled?: boolean; note?: string }) {
  const t = useT();
  return <><StepNote note={note} /><div className="navigation"><button className="skip-button" onClick={onNext}>{t("common.skip")}</button><button className="primary-button" disabled={disabled} onClick={onNext}>{t("common.next")} <span>→</span></button></div></>;
}
function StepNote({ note }: { note?: string }) { return note ? <p className="step-note" role="note">{note}</p> : null; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>; }
function quickAffectSuggestion(session: EmotionSession): AffectPoint | undefined {
  const affect = session.quickCheck?.affect;
  if (!affect || affect.unknown) return undefined;
  return { valence: affect.valence, activation: affect.activation };
}
function quickResponseLabel(t: Translate, response?: QuickNonSelection) { return response ? t(`quickCandidates.decline.${response}`) : ""; }
const stepNote = (stepNotes: LocaleContent["stepNotes"], step: keyof LocaleContent["stepNotes"]["steps"], shown: boolean) => (shown ? stepNotes.steps[step] : undefined);
