"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import bodySignals from "../data/body-signals.ko.json";
import concerns from "../data/concerns.ko.json";
import { canGoBack, createSession, sessionReducer, understandRoute } from "../lib/session-types";
import { APPRAISAL_ESCAPES, COACH_ESCAPES, coachResult, coachSetFor, coachSets } from "../lib/coach";
import type { AffectPoint, BodyObservation, DeepReflection, EmotionSelection, EmotionSession, QuickNonSelection, SynthesisFit } from "../lib/session-types";

type DeepContext = NonNullable<DeepReflection["context"]>;
type DeepOutcome = NonNullable<DeepReflection["outcome"]>;
import { dropCompleted, loadCompleted, loadDraft, persistSession, removeDraft, saveCompleted } from "../lib/storage";
import { HELPED, TRIED, formatWhen, needLabel, responseLabels, summarise } from "../lib/records";
import { migrateLegacyStorage } from "../lib/migrations";
import { expandCandidates, filterQuickCandidates } from "../lib/quick-check";
import { activationLabel, quickActivation, quickValence, scaleLabel } from "../lib/affect-labels";
import { buildSynthesis, hasSynthesis } from "../lib/synthesis";
import stepNotes from "../data/step-notes.ko.json";
import needsData from "../data/needs.ko.json";

const progress: Record<string, string> = {
  body: "1 / 6",
  affect: "2 / 6",
  context: "3 / 6",
  meaning: "4 / 6",
  emotion: "5 / 6",
  outcome: "6 / 6",
};

export default function Home() {
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
    if (records) return <RecordsScreen records={records} onOpen={setOpenRecord} onBack={() => setRecords(null)} />;
    return <LandingScreen onQuick={() => dispatch({ type: "START_QUICK" })} onDeep={() => dispatch({ type: "START_DEEP" })} draft={draft} onResume={resume} onRecords={showRecords} />;
  }

  const stop = () => {
    dispatch({ type: "STOP", reason: "user" });
    setStopConfirm(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#" onClick={() => window.location.reload()}>
          감정 관찰실
        </a>
        <div className="topbar-actions">
          {canGoBack(session) && <button className="text-button" onClick={() => dispatch({ type: "BACK" })}>← 한 단계 뒤로</button>}
          {session.stage !== "entry" && session.stage !== "stopped" && session.stage !== "summary" && session.stage !== "quick-summary" && session.stage !== "support" && (
            <button className="text-button" onClick={() => setStopConfirm(true)}>그만하기</button>
          )}
        </div>
      </header>

      {progress[session.stage] && (
        <div className="progress-row" aria-label={`진행 ${progress[session.stage]}`}>
          <span>{progress[session.stage]}</span>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(Object.keys(progress).indexOf(session.stage) + 1) * 16.66}%` }} /></div>
        </div>
      )}

      {session.stage === "quick-affect" && <QuickAffectScreen onNext={(affect) => { dispatch({ type: "SET_QUICK_AFFECT", affect }); dispatch({ type: "SET_QUICK_CANDIDATES", candidatePool: filterQuickCandidates({ x: affect.valence ?? 0.5, y: affect.activation ?? 0.5 }) }); }} onUnknown={() => dispatch({ type: "SET_QUICK_UNKNOWN" })} />}
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
  return <Screen className="entry-screen">
    <p className="eyebrow">감정 관찰실</p>
    <h1>지금 이 경험을<br />조금 들여다보고 싶나요?</h1>
    <p className="lede">서두르지 않아도 됩니다.<br />지금은 생각을 더 하지 않는 편이 낫다면 기록하지 않아도 됩니다.</p>
    <div className="stack-actions">
      <button className="primary-button" onClick={onStart}>조금 살펴보고 싶어요 <span>→</span></button>
      <button className="secondary-button" onClick={onUnsure}>잘 모르겠어요</button>
      <button className="quiet-button" onClick={onStop}>지금은 그만 생각하고 싶어요</button>
    </div>
    {draft && <div className="resume-card"><div><strong>이어 쓰지 않은 기록이 있어요</strong><span>이전 진행 상황을 이 기기에서 불러옵니다.</span></div><button className="small-button" onClick={onResume}>이어하기</button></div>}
  </Screen>;
}

function LandingScreen({ onQuick, onDeep, draft, onResume, onRecords }: { onQuick: () => void; onDeep: () => void; draft: EmotionSession | null; onResume: () => void; onRecords: () => void }) {
  return <Screen className="entry-screen"><p className="eyebrow">감정 관찰실</p><h1>지금의 경험을<br />조금 더 알아보기</h1><p className="lede">감정을 맞히는 검사가 아닙니다.<br />빠르게 살펴보거나, 천천히 구별해볼 수 있습니다.</p><WhyThis /><WhyWords /><div className="stack-actions"><button className="primary-button" onClick={onQuick}>빠르게 살펴보기 <span>→</span></button><button className="secondary-button" onClick={onDeep}>조금 더 천천히 살펴보기</button>{draft && <button className="secondary-button" onClick={onResume}>지난 기록 이어하기</button>}<button className="secondary-button" onClick={onRecords}>지난 기록 보기</button></div><p className="small-note">기록은 이 기기에만 저장됩니다. 언제든 건너뛰거나 닫을 수 있습니다.</p></Screen>;
}

/**
 * One instrument for both passes. The position is continuous and is never shown
 * as a number; Quick and Deep differ only in the question above it, so the two
 * readings can be compared at the end.
 */
function AffectPad({ initial, onChange }: { initial?: AffectPoint; onChange: (point: { valence: number; activation: number }) => void }) {
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
    <div className="affect-axis-label top">에너지가 올라온 느낌</div>
    <div className="affect-grid" role="application" tabIndex={0} aria-label="불쾌함과 유쾌함, 가라앉음과 활성됨 사이에서 현재 경험에 가까운 곳 선택. 방향키로도 움직일 수 있습니다." onPointerDown={fromPointer} onKeyDown={nudge}>
      {point && <span className="affect-dot" style={{ left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }} />}
    </div>
    <div className="affect-axis-row"><span>불쾌함</span><span>유쾌함</span></div>
    <div className="affect-axis-label bottom">가라앉은 느낌</div>
  </div>;
}

function WhyThis() {
  return <details className="why">
    <summary>왜 감정을 조금 더 자세히 살펴볼까요?</summary>
    <div className="why-body">
      <p>“기분이 좋다 / 나쁘다” 정도로 충분한 순간도 많습니다. 늘 자세히 볼 필요는 없습니다.</p>
      <p>다만 때로는 비슷해 보이는 경험을 조금 더 구별해보면, 지금 무엇이 필요한지 고르는 데 도움이 되기도 합니다. 같은 답답함이라도 쉬는 것이 필요할 때와, 하고 싶은 말을 정리하는 것이 필요할 때가 다르기 때문입니다.</p>
      <p>감정을 세밀하게 구별하는 정도(emotional granularity)는 여러 연구에서 정서조절이나 일상 기능과 관련되어 있다고 보고되었습니다. 다만 <strong>granularity 자체가 건강을 보장하지도, 정신건강을 재는 지표도 아닙니다.</strong> 대부분 상관 연구이고, 이 앱의 효과를 검증한 것도 아닙니다.</p>
      <p className="why-principle">목표는 최대한 세밀하게 분석하는 것이 아니라, <strong>지금 무엇을 할지 정하는 데 필요한 만큼만</strong> 구별하는 것입니다.</p>
    </div>
  </details>;
}

function QuickAffectScreen({ onNext, onUnknown }: { onNext: (affect: AffectPoint) => void; onUnknown: () => void }) {
  const [point, setPoint] = useState<{ valence: number; activation: number } | null>(null);
  return <Screen>
    <StepHeading step="빠른 확인" title="지금은 어느 쪽에 가까운가요?" hint="정확한 좌표를 고를 필요 없이, ‘이쯤’이라고 느껴지는 곳을 한 번 눌러보세요." />
    <AffectPad onChange={setPoint} />
    <div className="quick-actions">
      <button className="quiet-button" onClick={onUnknown}>잘 모르겠음</button>
      <button className="primary-button" disabled={!point} onClick={() => point && onNext(point)}>다음 <span>→</span></button>
    </div>
  </Screen>;
}

function TieredWords({ pool, selectedLabels, ownWords, onToggle, onAddCustom, meanings, onMeaning }: { pool: EmotionSelection[]; selectedLabels: string[]; ownWords: string[]; onToggle: (label: string) => void; onAddCustom: (label: string) => void; meanings?: Record<string, string>; onMeaning?: (label: string, meaning: string) => void }) {
  const [tier, setTier] = useState<1 | 2>(1);
  const [custom, setCustom] = useState("");
  const poolLabels = pool.map((item) => item.label);
  const selectedAsItems = selectedLabels.map((label) => ({ label, source: "suggested" as const }));
  const expanded = expandCandidates([...pool, ...selectedAsItems]).filter((item) => !poolLabels.includes(item.label));
  const chip = (label: string) => <button className={`chip ${selectedLabels.includes(label) ? "selected" : ""}`} key={label} onClick={() => onToggle(label)}>{label}</button>;
  const addCustom = () => { onAddCustom(custom); setCustom(""); };

  return <>
    <div className="chip-grid">{pool.map((item) => chip(item.label))}</div>

    {tier === 1 && expanded.length > 0 && <button className="reveal-button" onClick={() => setTier(2)}>비슷한 표현 더 보기</button>}
    {tier >= 2 && expanded.length > 0 && <>
      <p className="tier-label">비슷한 표현</p>
      <div className="chip-grid">{expanded.map((item) => chip(item.label))}</div>
    </>}

    {ownWords.length > 0 && <>
      <p className="tier-label">내가 적은 말</p>
      <div className="chip-grid">{ownWords.map((label) => chip(label))}</div>
      {onMeaning && ownWords.map((label) => <div className="own-meaning" key={label}>
        <label className="field-label" htmlFor={`meaning-${label}`}>‘{label}’은 지금 나에게 어떤 느낌을 담고 있나요? <em>(선택)</em></label>
        <input id={`meaning-${label}`} className="text-input" defaultValue={meanings?.[label] ?? ""} onChange={(event) => onMeaning(label, event.target.value)} placeholder="적지 않아도 됩니다" />
      </div>)}
    </>}

    <div className="own-word-block">
      <p className="tier-label">여기 없는 말이 더 가깝다면</p>
      <div className="own-word-row">
        <input className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustom(); }} placeholder="내 말로 적기" aria-label="내 말로 적기" />
        <button className="small-button" disabled={!custom.trim()} onClick={addCustom}>추가</button>
      </div>
      <p className="small-note">이 목록은 완전한 목록이 아니라 출발점입니다. 내 말로 적는 것도 똑같이 정상적인 길이에요.</p>
    </div>
  </>;
}

function QuickCandidatesScreen({ pool, selected, response, onToggle, onRespond, onAddCustom, onMeaning, onFinish, onCoach, onDeep }: { pool: EmotionSelection[]; selected: EmotionSelection[]; response?: QuickNonSelection; onToggle: (label: string) => void; onRespond: (response: QuickNonSelection) => void; onAddCustom: (label: string) => void; onMeaning: (label: string, meaning: string) => void; onFinish: () => void; onCoach: () => void; onDeep: () => void }) {
  const canCoach = coachSets.some((set) => selected.some((item) => set.words.includes(item.label)));
  return <Screen>
    <StepHeading step="가능한 표현" title="지금 경험을 표현할 때 가까울 수도 있는 말입니다." hint="감정을 판정하는 결과가 아닙니다. 여러 개를 골라도 되고, 맞지 않으면 고르지 않아도 됩니다." />
    <div className="provisional-note">임시 단어 모음 · 스스로 고른 표현만 기록됩니다</div>
    <TieredWords pool={pool} selectedLabels={selected.map((item) => item.label)} ownWords={selected.filter((item) => item.source === "custom").map((item) => item.label)} onToggle={onToggle} onAddCustom={onAddCustom} meanings={Object.fromEntries(selected.filter((item) => item.personalMeaning).map((item) => [item.label, item.personalMeaning!]))} onMeaning={onMeaning} />

    <div className="quick-option-row">{([["none-close", "가까운 말이 없음"], ["unsure", "잘 모르겠음"]] as const).map(([value, label]) => <button className={`secondary-button ${response === value ? "selected" : ""}`} aria-pressed={response === value} key={value} onClick={() => onRespond(value)}>{label}</button>)}</div>
    {response && <p className="small-note">{response === "none-close" ? "가까운 말이 없다고" : "잘 모르겠다고"} 기록했습니다. 이대로 끝내도 되고, 천천히 더 살펴봐도 됩니다.</p>}

    <div className="quick-bottom-actions">
      <button className="quiet-button" onClick={onFinish}>여기까지</button>
      {canCoach ? <button className="primary-button" onClick={onCoach}>표현 사이의 차이 살펴보기 <span>→</span></button> : <button className="secondary-button" onClick={onDeep}>조금 더 천천히 들여다보기</button>}
    </div>
    {canCoach && <p className="small-note">예시 상황으로 해보는 짧은 연습입니다. 지금 고른 표현은 그대로 남습니다. 예시는 일부 후보에만 준비되어 있습니다.</p>}
  </Screen>;
}

/** Asks what mattered before showing any word, so no list reads as a set of right answers. */
/**
 * Sits beside WhyThis, both collapsed, so the buttons stay near the top. The
 * Barrett paragraph is set apart because it is one theoretical position rather
 * than a settled result — see docs/EMOTION_CULTURE.md.
 */
function WhyWords() {
  return <details className="why">
    <summary>감정 이름에도 하나의 정답이 있을까요?</summary>
    <div className="why-body">
      <p>우리가 감정을 표현하는 방식은 몸의 느낌과 상황뿐 아니라, 살아온 경험과 언어, 관계와 문화의 영향을 받습니다. 같은 경험도 사람이나 공동체에 따라 조금 다르게 나누고 부를 수 있어요.</p>
      <p>그래서 이 앱은 당신의 ‘진짜 감정’을 찾아내려 하지 않습니다. 대신 지금 경험을 이해하는 데 도움이 되는 말을 함께 찾아봅니다. 여기 있는 단어들은 완전한 목록이 아니라 <strong>출발점</strong>이고, <strong>내 말로 적는 것이 예외가 아니라 정상적인 길</strong>입니다.</p>
      <p className="why-principle">언어를 가로질러 비교적 널리 통하는 것은 <strong>불쾌함–유쾌함</strong>과 <strong>가라앉음–활성됨</strong> 같은 넓은 방향입니다. 반면 그 안을 어떤 단어로 나누는지는 언어와 문화에 따라 달라질 수 있습니다. 그래서 이 앱은 방향은 함께 짚어보고, <strong>이름은 당신이 고릅니다.</strong></p>
      <details className="why-deeper">
        <summary>조금 더 — 감정이 사회적으로 만들어진다는 말</summary>
        <p>감정이 사회적으로 구성된다는 것은 감정이 가짜라는 뜻이 아닙니다. 한 과학적 관점에서는 몸과 뇌의 변화가 실제로 존재하면서도, 사람들이 공유하고 배운 감정 개념이 그 경험에 의미와 기능을 부여한다고 봅니다.</p>
        <p>화폐의 가치가 종이의 물리적 성질만으로 설명되지 않지만 실제로 우리 삶에서 작동하는 것과 비슷한 비유를 생각해볼 수 있습니다.</p>
        <p>다만 이것은 <strong>하나의 이론적 입장이고</strong>, 감정이 얼마나 보편적이고 얼마나 문화적으로 구성되는지는 <strong>여전히 연구 중</strong>입니다.</p>
      </details>
    </div>
  </details>;
}

/**
 * The coach is practice on a written example, so every screen says so up front,
 * outside any disclosure: the user's own moment is not what is being recorded.
 */
function ExampleNotice() {
  return <p className="example-notice" role="note"><strong>예시 상황으로 해보는 표현 연습입니다.</strong> 당신의 실제 일이나 지금 감정을 기록하는 단계가 아니고, 앞에서 고른 내 표현은 바뀌지 않습니다.</p>;
}

/**
 * Putting the example down is not stopping the record: it returns to the
 * summary the user came from, and 그만하기 in the top bar stays for stopping.
 */
function CoachNavigation({ onNext, onLeave }: { onNext: () => void; onLeave: () => void }) {
  return <div className="navigation"><button className="quiet-button coach-leave" onClick={onLeave}>예시 연습 그만하고 요약으로</button><button className="primary-button" onClick={onNext}>다음 <span>→</span></button></div>;
}

/** A selected choice carries a visible mark, so the state never rests on colour alone. */
function Mark({ on }: { on: boolean }) {
  return on ? <span className="choice-mark" aria-hidden="true">✓ </span> : null;
}

/** Asks what stands out in the example before showing any word, so no list reads as a set of right answers. */
function CoachAppraisalScreen({ session, onToggle, onOwn, onNext, onLeave }: { session: EmotionSession; onToggle: (id: string) => void; onOwn: (label: string) => void; onNext: () => void; onLeave: () => void }) {
  const set = coachSetFor(session);
  const [own, setOwn] = useState(session.coach?.ownAppraisal ?? "");
  const picked = session.coach?.appraisals ?? [];
  if (!set) return <Screen><StepHeading step="예시로 연습하기" title="아직 비교해볼 세트가 없습니다." hint="고른 표현에 맞는 예시가 아직 준비되지 않았습니다." /></Screen>;
  return <Screen>
    <StepHeading step="예시로 연습하기" title={set.question} hint="같은 예시라도 사람마다, 또 어떤 관계와 상황인지에 따라 눈에 들어오는 것이 다를 수 있어요. 정답을 맞히는 문제가 아닙니다." />
    <ExampleNotice />
    <div className="scenario-card"><span className="scenario-label">예시 상황</span>{set.event}</div>
    <p className="small-note">여러 개를 골라도 되고, 하나도 고르지 않아도 됩니다.</p>
    <div className="choice-list">{[...set.appraisals, ...APPRAISAL_ESCAPES].map((item) => <button className={picked.includes(item.id) ? "selected" : ""} aria-pressed={picked.includes(item.id)} key={item.id} onClick={() => onToggle(item.id)}><Mark on={picked.includes(item.id)} />{item.text}</button>)}</div>
    <label className="field-label" htmlFor="coach-own-appraisal">이 예시에서 눈에 띈 다른 것을 내 말로 적기</label>
    <input id="coach-own-appraisal" className="text-input" value={own} onChange={(event) => { setOwn(event.target.value); onOwn(event.target.value); }} placeholder="예: 대답을 기다리는 시간이 길었다" />
    <CoachNavigation onNext={onNext} onLeave={onLeave} />
  </Screen>;
}

/**
 * Every offered word looks the same and sits in the same order whatever was
 * picked on the previous screen; nothing is pre-selected or suggested.
 */
function CoachWordsScreen({ session, onToggle, onOwnWord, onNext, onLeave }: { session: EmotionSession; onToggle: (label: string) => void; onOwnWord: (label: string) => void; onNext: () => void; onLeave: () => void }) {
  const set = coachSetFor(session);
  const [own, setOwn] = useState(session.coach?.ownWord ?? "");
  const picked = session.coach?.wordsAfter ?? [];
  const observations = coachResult(session)?.observations ?? [];
  return <Screen>
    <StepHeading step="예시로 연습하기" title="이 예시에서 가까울 수 있는 표현이 있나요?" hint="아래 표현에는 순서나 정답이 없습니다. 이 세 가지가 이 예시를 나누는 유일한 방법도 아니어서, 다른 말을 직접 적는 것도 똑같은 선택입니다." />
    {set && <div className="scenario-card compact"><span className="scenario-label">예시 상황</span>{set.event}{observations.length > 0 && <span className="scenario-picked">눈에 띈 것 · {observations.join(" ")}</span>}</div>}
    <div className="chip-grid" role="group" aria-label="이 예시에서 가까울 수 있는 표현">{[...(set?.words ?? []), ...COACH_ESCAPES].map((label) => <button className={`chip ${picked.includes(label) ? "selected" : ""}`} aria-pressed={picked.includes(label)} key={label} onClick={() => onToggle(label)}><Mark on={picked.includes(label)} />{label}</button>)}</div>
    <label className="field-label" htmlFor="coach-own">내 말로 표현하기</label>
    <input id="coach-own" className="text-input" value={own} onChange={(event) => { setOwn(event.target.value); onOwnWord(event.target.value); }} placeholder="예: 김이 새는 느낌" />
    <p className="small-note">여러 개를 골라도, 하나도 고르지 않아도 됩니다.</p>
    <CoachNavigation onNext={onNext} onLeave={onLeave} />
  </Screen>;
}

/**
 * Shows what was explored in the example, and only that. The user's own words
 * from before the coach are deliberately not put beside it: the two answer
 * different questions, so side by side they would read as a change in feeling.
 */
function CoachNoteScreen({ session, onDone }: { session: EmotionSession; onDone: () => void }) {
  const set = coachSetFor(session);
  const result = coachResult(session);
  const fromExample = result?.origin === "example-practice";
  return <Screen>
    <p className="eyebrow">예시로 연습하기 · 짧은 참고</p>
    <h1>단어는 정답표가 아니라<br />살펴보는 도구입니다.</h1>
    <p className="lede">{set?.note}</p>
    {result && <div className="summary-card">
      <SummaryRow label={fromExample ? "예시에서 눈에 띈 것" : "이 단계에서 고른 관찰"} value={result.observations.join(" ") || "고르지 않음"} />
      <SummaryRow label={fromExample ? "예시에 가까울 수 있는 표현" : "이 단계에서 고른 표현"} value={result.expressions.join(" · ") || "고르지 않음"} />
    </div>}
    <p className="summary-footnote">{fromExample ? "예시 연습의 결과입니다. 앞에서 고른 내 표현을 바꾸지 않고, 요약에도 쓰이지 않습니다." : "이 기록이 예시 연습으로 저장되었는지는 확인할 수 없습니다. 앞에서 고른 내 표현을 바꾸지 않고, 요약에도 쓰이지 않습니다."}</p>
    <button className="primary-button" onClick={onDone}>요약으로 돌아가기</button>
  </Screen>;
}

function QuickSummaryScreen({ session, onDeep, onFeedback, onSupport }: { session: EmotionSession; onDeep: () => void; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void; onSupport: () => void }) {
  const quick = session.quickCheck;
  const affect = quick?.affect?.unknown ? "잘 모르겠음" : `${quickValence(quick?.affect?.valence)} · ${quickActivation(quick?.affect?.activation)}`;
  const words = (quick?.selected ?? []).map((item) => item.label).join(" · ") || quickResponseLabel(quick?.candidateResponse) || "고르지 않음";
  return <Screen><p className="eyebrow">빠른 확인</p><h1>여기까지 살펴보았습니다.</h1><div className="summary-card"><SummaryRow label="전체적인 느낌" value={affect} /><SummaryRow label="가까웠던 말" value={words} />{quick?.granularityResponse === "unsure" && <SummaryRow label="더 살펴본 표현" value="잘 모르겠음" />}{quick?.contrastAnswer && <SummaryRow label="상황 속 차이" value={quick.contrastAnswer} />}</div><p className="summary-footnote">이것은 감정의 판정이 아니라, 지금 경험을 표현해볼 수 있는 작은 단서입니다.</p><SynthesisSection session={session} onFeedback={onFeedback} /><div className="stack-actions"><button className="primary-button centered" onClick={onDeep}>조금 더 천천히 들여다보기 <span>→</span></button><button className="secondary-button" onClick={onSupport}>그래서 지금 무엇이 필요할지 살펴보기</button><a className="secondary-button centered" href="/">처음으로 돌아가기</a></div></Screen>;
}

function EntryMini({ onAnswer }: { onAnswer: (answer: "yes" | "unsure" | "no") => void }) {
  return <Screen><p className="eyebrow">짧은 확인</p><h1>지금 몸은 어떤 쪽에<br />가까운가요?</h1><p className="lede">그리고 이것을 생각하는 것이 지금 도움이 될 것 같나요?</p><div className="choice-list"><button onClick={() => onAnswer("yes")}>조금 살펴보는 것이 도움될 것 같아요</button><button onClick={() => onAnswer("unsure")}>잘 모르겠어요</button><button onClick={() => onAnswer("no")}>지금은 도움이 되지 않을 것 같아요</button></div></Screen>;
}

function BodyScreen({ initial, onNext }: { initial: BodyObservation[]; onNext: (body: BodyObservation[]) => void }) {
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
    <StepHeading step="몸" title="먼저, 몸에서는 무엇이 느껴지나요?" hint="감정 이름을 찾기 전에 지금 몸에서 알아차릴 수 있는 것부터 봅니다. 자세를 고쳐 앉을 필요는 없습니다 — 지금 이 순간 알아차린 것이면 충분합니다." />
    <div className="chip-grid">{first.map((item) => chip(item.label))}</div>
    {!showAll && <button className="reveal-button" onClick={() => setShowAll(true)}>다른 몸의 느낌 보기</button>}
    {showAll && rest.map((group) => <div key={group.region}>
      <p className="tier-label">{group.region}</p>
      <div className="chip-grid">{group.labels.map((label) => chip(label))}</div>
    </div>)}
    <label className="field-label" htmlFor="body-custom">다른 느낌이 있다면 적어도 됩니다</label>
    <input id="body-custom" className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="예: 손이 차가움" />
    <Navigation
      note={stepNote("body", selected.length > 0 || custom.trim().length > 0)}
      onNext={() => onNext([...selected.filter((label) => label !== custom).map((label) => ({ label })), ...(custom.trim() ? [{ label: custom.trim(), custom: true }] : [])])}
    />
  </Screen>;
}

function AffectScreen({ initial, onNext }: { initial?: AffectPoint; onNext: (affect: AffectPoint) => void }) {
  const [point, setPoint] = useState<{ valence: number; activation: number } | null>(
    initial && !initial.unknown && initial.valence !== undefined && initial.activation !== undefined
      ? { valence: initial.valence, activation: initial.activation }
      : null,
  );
  const [touched, setTouched] = useState(false);
  return <Screen>
    <StepHeading step="전체적인 느낌" title="조금 더 살펴본 지금은 어느 쪽에 가까운가요?" hint="빠른 확인에서 표시한 곳이 먼저 놓여 있습니다. 그대로 두어도 되고 옮겨도 됩니다." />
    <AffectPad initial={initial} onChange={(next) => { setTouched(true); setPoint(next); }} />
    <Navigation note={stepNote("affect", touched)} onNext={() => onNext(point ?? initial ?? {})} />
  </Screen>;
}

function ContextScreen({ initial, onNext }: { initial?: DeepContext; onNext: (context: DeepContext) => void }) {
  const [text, setText] = useState(initial?.eventText ?? "");
  const [source, setSource] = useState<DeepContext["source"]>(initial?.source ?? "event");
  return <Screen><StepHeading step="상황" title="무슨 일이 있었나요?" hint="사실만 간단히 적어도 충분합니다." /><textarea className="text-area" value={text} onChange={(event) => setText(event.target.value)} placeholder="지금 떠오르는 일을 적어보세요" /><div className="segmented"><span>이것은 무엇에 가까운가요?</span>{([['event','실제 사건'],['memory','기억'],['anticipation','예상'],['thought','생각']] as const).map(([value, label]) => <button className={source === value ? "selected" : ""} key={value} onClick={() => setSource(value)}>{label}</button>)}</div><Navigation note={stepNote("context", text.trim().length > 0)} onNext={() => onNext({ eventText: text, source })} /></Screen>;
}

function MeaningScreen({ initial, onNext }: { initial: string[]; onNext: (selected: string[]) => void }) {
  const [selected, setSelected] = useState(initial);
  const [custom, setCustom] = useState("");
  const toggle = (item: string) => setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  return <Screen><StepHeading step="중요했던 것" title="그 순간 무엇이 중요했던 것 같나요?" hint="정답을 찾는 질문이 아닙니다. 가까운 것을 골라도, 잘 모르겠다고 해도 됩니다." /><div className="choice-list compact">{concerns.map((item) => <button className={selected.includes(item) ? "selected" : ""} key={item} onClick={() => toggle(item)}>{item}</button>)}</div><input className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="내 말로 적기" /><Navigation note={stepNote("meaning", selected.length > 0 || custom.trim().length > 0)} onNext={() => onNext([...selected, ...(custom ? [custom] : [])])} /></Screen>;
}

function EmotionScreen({ initial, affect, onNext }: { initial: EmotionSelection[]; affect?: AffectPoint; onNext: (selected: EmotionSelection[]) => void }) {
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
  const pool = filterQuickCandidates({ x: affect?.valence ?? 0.5, y: affect?.activation ?? 0.5 });
  return <Screen>
    <StepHeading step="가까운 표현" title="지금까지 적은 경험에 가까운 단어가 있나요?" hint="이 단어들은 정답이 아니라, 지금 경험을 표현해보는 임시 후보입니다." />
    <div className="provisional-note">임시 단어 모음 · 스스로 고른 표현만 기록됩니다</div>
    <TieredWords pool={pool} selectedLabels={selected} ownWords={ownWords} onToggle={toggle} onAddCustom={addOwnWord} />
    <div className="quick-option-row">{["여러 개", "잘 모르겠음"].map((label) => <button className={`secondary-button ${selected.includes(label) ? "selected" : ""}`} aria-pressed={selected.includes(label)} key={label} onClick={() => toggle(label)}>{label}</button>)}</div>
    <Navigation note={stepNote("emotion", selected.length > 0)} onNext={() => onNext(selected.map((label) => ({ label, source: ownWords.includes(label) ? "custom" as const : "suggested" as const })))} />
  </Screen>;
}

function OutcomeScreen({ onNext }: { onNext: (outcome: DeepOutcome) => void }) {
  const [clarity, setClarity] = useState<DeepOutcome["clarity"]>();
  const [usefulness, setUsefulness] = useState<DeepOutcome["usefulness"]>();
  const [note, setNote] = useState("");
  return <Screen><StepHeading step="도움 여부" title="처음보다 지금 경험이 조금 더 분명해졌나요?" hint="더 복잡해지거나 불편해졌다면 그렇게 알려주어도 됩니다." /><div className="choice-list compact">{([['much_clearer','많이 더 분명해짐'],['clearer','조금 더 분명해짐'],['same','비슷함'],['more_complex','더 복잡해짐'],['more_distressed','더 불편해짐']] as const).map(([value, label]) => <button className={clarity === value ? "selected" : ""} key={value} onClick={() => setClarity(value)}>{label}</button>)}</div><h2 className="subquestion">이 기록은 지금 도움이 되었나요?</h2><div className="inline-choices">{([['helpful','도움됨'],['unsure','잘 모르겠음'],['unhelpful','도움되지 않음']] as const).map(([value, label]) => <button className={usefulness === value ? "selected" : ""} key={value} onClick={() => setUsefulness(value)}>{label}</button>)}</div><input className="text-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="덧붙이고 싶은 한 줄 (선택)" /><Navigation disabled={!clarity || !usefulness} onNext={() => onNext({ clarity: clarity!, usefulness: usefulness!, note })} /></Screen>;
}

function SummaryScreen({ session, onFeedback, onSupport }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void; onSupport: () => void }) {
  const deep = session.deepReflection;
  const quickAffect = session.quickCheck?.affect;
  return <Screen><p className="eyebrow">이번 기록에서</p><h1>여기까지 살펴보았습니다.</h1><div className="summary-card">{quickAffect && <SummaryRow label="처음 빠른 확인" value={quickAffect.unknown ? "잘 모르겠음" : `${quickValence(quickAffect.valence)} · ${quickActivation(quickAffect.activation)}`} />}<SummaryRow label="몸" value={(deep?.body ?? []).map((item) => item.label).join(" · ") || "기록하지 않음"} /><SummaryRow label="전체적인 느낌" value={`${scaleLabel(deep?.affect?.valence)} · ${activationLabel(deep?.affect?.activation)}`} /><SummaryRow label="상황" value={deep?.context?.eventText || "기록하지 않음"} /><SummaryRow label="중요했던 것" value={(deep?.concerns ?? []).join(" · ") || "기록하지 않음"} /><SummaryRow label="가까웠던 말" value={(deep?.emotionCandidates ?? []).map((item) => item.label).join(" · ") || "기록하지 않음"} /></div><p className="summary-footnote">감정의 정답을 찾은 것이 아니라, 지금 경험을 표현할 수 있는 몇 가지 단서를 남겼습니다.</p><SynthesisSection session={session} onFeedback={onFeedback} /><div className="stack-actions"><button className="primary-button centered" onClick={onSupport}>그래서 지금 무엇이 필요할까요? <span>→</span></button><a className="secondary-button centered" href="/">처음으로 돌아가기</a></div></Screen>;
}

function SynthesisSection({ session, onFeedback }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void }) {
  const synthesis = buildSynthesis(session);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState(session.synthesisFeedback?.correction ?? "");
  const fit = session.synthesisFeedback?.fit;
  if (!hasSynthesis(synthesis)) return null;
  const block = (title: string, lines: { id: string; text: string }[]) =>
    lines.length ? <><p className="tier-label">{title}</p><ul className="synthesis-lines">{lines.map((line) => <li key={line.id}>{line.text}</li>)}</ul></> : null;

  return <section className="synthesis">
    <h2 className="synthesis-title">지금까지의 경험을<br />이렇게 정리해볼 수 있어요</h2>
    <p className="synthesis-lead">{synthesis.lead}</p>

    {block("관찰한 것", synthesis.observed)}
    {block("연결해서 생각해볼 수 있는 것", synthesis.meaning)}
    {block("아직 알기 어려운 것", synthesis.unknown)}

    {synthesis.questions.length > 0 && <>
      <p className="tier-label">다음에 생각해볼 질문</p>
      <ul className="synthesis-questions">{synthesis.questions.map((question) => <li key={question}>{question}</li>)}</ul>
    </>}

    <p className="synthesis-caveat">{synthesis.caveat}</p>

    <p className="synthesis-question">이 설명이 지금 경험과 얼마나 맞나요?</p>
    <div className="inline-choices">{([["close", "꽤 맞아요"], ["partly", "일부만 맞아요"], ["unsure", "잘 모르겠어요"]] as const).map(([value, label]) => <button className={fit === value ? "selected" : ""} aria-pressed={fit === value} key={value} onClick={() => onFeedback({ fit: value })}>{label}</button>)}</div>

    {editing
      ? <div className="own-word-block">
          <textarea className="text-area" value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder="지금 경험을 내 말로 다시 적어보세요" aria-label="내 말로 고쳐보기" />
          <div className="quick-option-row">
            <button className="small-button" onClick={() => { onFeedback({ correction }); setEditing(false); }}>이 기록에 남기기</button>
            <button className="quiet-button" onClick={() => { setCorrection(session.synthesisFeedback?.correction ?? ""); setEditing(false); }}>취소</button>
          </div>
        </div>
      : <button className="quiet-button" onClick={() => setEditing(true)}>내 말로 고쳐보기</button>}
    {!editing && session.synthesisFeedback?.correction && <p className="synthesis-correction">“{session.synthesisFeedback.correction}”</p>}
  </section>;
}

type NeedEntry = { id: string; label: string; group?: string; because?: string; route?: boolean; exit?: boolean; responses?: { id: string; label: string }[] };

/**
 * One screen, two levels. Picking a direction opens the things that can be done
 * in it, right below. Nothing is ranked, nothing is recommended, and switching
 * direction never discards what was picked under another one.
 */
function NeedScreen({ session, onNeed, onResponse, onDeep, onCoach, onBack }: { session: EmotionSession; onNeed: (id: string) => void; onResponse: (id: string) => void; onDeep: () => void; onCoach: () => void; onBack: () => void }) {
  const list = needsData.needs as NeedEntry[];
  const need = list.find((item) => item.id === session.support?.need);
  const picked = session.support?.choicesByNeed?.[need?.id ?? ""] ?? [];
  const route = understandRoute(session);
  return <Screen>
    <StepHeading step="지금 필요한 것" title="지금 가장 필요한 방향은 어느 쪽에 가까운가요?" hint="앱이 정해주지 않습니다. 하나를 골라보고, 다른 쪽이 궁금하면 언제든 바꿔도 됩니다." />
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
      {route === "deep" && <button className="primary-button centered" onClick={onDeep}>조금 더 천천히 살펴보기 <span>→</span></button>}
      {route === "coach" && <button className="primary-button centered" onClick={onCoach}>비슷한 표현의 차이를 살펴보기 <span>→</span></button>}
      {route === "none" && <p className="small-note">고른 표현에 맞는 상황 비교가 아직 준비되지 않았습니다. 다른 방향을 눌러보셔도 됩니다.</p>}
    </div>}

    {need?.exit && <p className="small-note">그대로 두어도 됩니다. 여기서 마쳐도 기록은 남습니다.</p>}

    <p className="small-note">같은 경험이라도 필요한 것은 그때그때 다를 수 있습니다. 편안하거나 벅찬 경험이라면 문제를 풀기보다 머물러 느끼는 쪽이 맞을 수도 있습니다.</p>
    <div className="navigation"><button className="quiet-button" onClick={onBack}>← 요약으로 돌아가기</button><a className="primary-button" href="/">여기까지 <span>→</span></a></div>
  </Screen>;
}

/** A list of what was recorded. No scores, no patterns across records, no interpretation. */
function RecordsScreen({ records, onOpen, onBack }: { records: EmotionSession[]; onOpen: (session: EmotionSession) => void; onBack: () => void }) {
  return <Screen className="entry-screen">
    <p className="eyebrow">지난 기록</p>
    <h1>이전에 적은 것들</h1>
    {records.length === 0
      ? <p className="lede">아직 남긴 기록이 없습니다.</p>
      : <div className="record-list">{records.map((session) => {
          const item = summarise(session);
          return <button className="record-row" key={item.id} onClick={() => onOpen(session)}>
            <span className="record-when">{formatWhen(item.at)}<em>{item.depthLabel}</em></span>
            <strong>{item.words.join(" · ") || "고른 표현 없음"}</strong>
            {item.needLabel && <span className="record-need">필요했던 방향 · {item.needLabel}</span>}
            {item.responseLabels.length > 0 && <span className="record-need">해보기로 한 것 · {item.responseLabels.join(" / ")}</span>}
          </button>;
        })}</div>}
    <div className="navigation"><button className="quiet-button" onClick={onBack}>← 처음으로</button><span /></div>
  </Screen>;
}

function RecordDetail({ session, onFollowUp, onBack }: { session: EmotionSession; onFollowUp: (followUp: { tried?: "yes" | "partly" | "no"; helped?: "yes" | "somewhat" | "no" | "unsure" }) => void; onBack: () => void }) {
  const item = summarise(session);
  const followUp = session.support?.followUp;
  const deep = session.deepReflection;
  return <Screen>
    <p className="eyebrow">지난 기록</p>
    <h1>{formatWhen(item.at)}</h1>
    <div className="summary-card">
      <SummaryRow label="살펴본 정도" value={item.depthLabel} />
      {session.quickCheck?.affect && <SummaryRow label="빠른 확인" value={session.quickCheck.affect.unknown ? "잘 모르겠음" : `${quickValence(session.quickCheck.affect.valence)} · ${quickActivation(session.quickCheck.affect.activation)}`} />}
      {deep?.affect && <SummaryRow label="자세히 본 뒤" value={`${scaleLabel(deep.affect.valence)} · ${activationLabel(deep.affect.activation)}`} />}
      <SummaryRow label="가까웠던 말" value={item.words.join(" · ") || "고르지 않음"} />
      {item.personalMeanings.map((entry) => <SummaryRow key={entry.label} label={`‘${entry.label}’은`} value={entry.meaning} />)}
      {deep?.context?.eventText && <SummaryRow label="상황" value={deep.context.eventText} />}
      {item.needLabel && <SummaryRow label="필요했던 방향" value={item.needLabel} />}
      {item.responseLabels.length > 0 && <SummaryRow label="해보기로 한 것" value={item.responseLabels.join(" / ")} />}
    </div>

    {item.canFollowUp && <section className="synthesis">
      <p className="tier-label">그 뒤에는 어땠나요</p>
      <p className="synthesis-question">그때 골랐던 것을 실제로 해봤나요?</p>
      <div className="inline-choices">{TRIED.map((option) => <button className={followUp?.tried === option.id ? "selected" : ""} aria-pressed={followUp?.tried === option.id} key={option.id} onClick={() => onFollowUp({ tried: option.id })}>{option.label}</button>)}</div>
      {(followUp?.tried === "yes" || followUp?.tried === "partly") && <>
        <p className="synthesis-question">조금이라도 도움이 됐나요?</p>
        <div className="inline-choices">{HELPED.map((option) => <button className={followUp?.helped === option.id ? "selected" : ""} aria-pressed={followUp?.helped === option.id} key={option.id} onClick={() => onFollowUp({ helped: option.id })}>{option.label}</button>)}</div>
      </>}
      <p className="synthesis-caveat">평가가 아닙니다. “아니요”도 그대로 정상적인 답입니다. 이 답으로 방법을 추천하거나 점수를 매기지 않습니다.</p>
    </section>}

    <div className="navigation"><button className="quiet-button" onClick={onBack}>← 목록으로</button><a className="primary-button" href="/">처음으로 <span>→</span></a></div>
  </Screen>;
}

function StoppedScreen({ session }: { session: EmotionSession }) { return <Screen className="entry-screen"><p className="eyebrow">여기까지</p><h1>지금은 더 살펴보지<br />않아도 됩니다.</h1><p className="lede">경험에서 조금 거리를 두는 것도 선택입니다. 이 기록은 완료된 기록이 아니라, 중단한 기록으로 이 기기에 남습니다.</p><div className="stack-actions"><a className="primary-button centered" href="/">기록실로 돌아가기</a><button className="quiet-button" onClick={() => { removeDraft(); dropCompleted(session.id); window.location.reload(); }}>이 기록을 지우기</button></div>{session.stopReason === "entry" && <p className="small-note">물 한 잔, 잠깐 걷기, 다른 일로 주의를 옮기기처럼 지금 가능한 것을 선택해보세요.</p>}</Screen>; }

function StopModal({ onClose, onStop }: { onClose: () => void; onStop: () => void }) { return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><p className="eyebrow">잠깐 확인할게요</p><h2>지금 더 생각하는 것이<br />도움이 되고 있나요?</h2><p>여기까지 알아차린 것으로 충분할 수 있습니다.</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>계속 살펴보기</button><button className="primary-button" onClick={onStop}>여기서 그만하기</button></div></div></div>; }

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`screen ${className}`}>{children}</section>; }
function StepHeading({ step, title, hint }: { step: string; title: string; hint: string }) { return <><p className="eyebrow">{step}</p><h1>{title}</h1><p className="hint">{hint}</p></>; }
function Navigation({ onNext, disabled = false, note }: { onNext: () => void; disabled?: boolean; note?: string }) {
  return <><StepNote note={note} /><div className="navigation"><button className="skip-button" onClick={onNext}>건너뛰기</button><button className="primary-button" disabled={disabled} onClick={onNext}>다음 <span>→</span></button></div></>;
}
function StepNote({ note }: { note?: string }) { return note ? <p className="step-note" role="note">{note}</p> : null; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>; }
function quickAffectSuggestion(session: EmotionSession): AffectPoint | undefined {
  const affect = session.quickCheck?.affect;
  if (!affect || affect.unknown) return undefined;
  return { valence: affect.valence, activation: affect.activation };
}
function quickResponseLabel(response?: QuickNonSelection) { return response === "none-close" ? "가까운 말이 없음" : response === "unsure" ? "잘 모르겠음" : ""; }
const stepNote = (step: keyof typeof stepNotes.steps, shown: boolean) => (shown ? stepNotes.steps[step] : undefined);
