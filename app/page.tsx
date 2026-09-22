"use client";

import { useEffect, useReducer, useState } from "react";
import bodySignals from "../data/body-signals.ko.json";
import concerns from "../data/concerns.ko.json";
import granularity from "../data/granularity.ko.json";
import { createSession, sessionReducer } from "../lib/session-types";
import type { BodyObservation, DeepReflection, EmotionSelection, EmotionSession, QuickCheck, QuickNonSelection, Scale, SynthesisFit } from "../lib/session-types";

type DeepAffect = NonNullable<DeepReflection["affect"]>;
type DeepContext = NonNullable<DeepReflection["context"]>;
type DeepOutcome = NonNullable<DeepReflection["outcome"]>;
import { loadDraft, persistSession, removeDraft } from "../lib/storage";
import { migrateLegacyStorage } from "../lib/migrations";
import { expandCandidates, filterQuickCandidates } from "../lib/quick-check";
import { activationLabel, quickActivation, quickValence, scaleLabel } from "../lib/affect-labels";
import { buildSynthesis, hasSynthesis } from "../lib/synthesis";
import stepNotes from "../data/step-notes.ko.json";

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

  const resume = () => {
    if (draft) dispatch({ type: "RESUME", session: draft });
  };

  if (session.stage === "landing") return <LandingScreen onQuick={() => dispatch({ type: "START_QUICK" })} onDeep={() => dispatch({ type: "START_DEEP" })} draft={draft} onResume={resume} />;

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
        {session.stage !== "entry" && session.stage !== "stopped" && session.stage !== "summary" && session.stage !== "quick-summary" && (
          <button className="text-button" onClick={() => setStopConfirm(true)}>그만하기</button>
        )}
      </header>

      {progress[session.stage] && (
        <div className="progress-row" aria-label={`진행 ${progress[session.stage]}`}>
          <span>{progress[session.stage]}</span>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(Object.keys(progress).indexOf(session.stage) + 1) * 16.66}%` }} /></div>
        </div>
      )}

      {session.stage === "quick-affect" && <QuickAffectScreen onNext={(affect) => { dispatch({ type: "SET_QUICK_AFFECT", affect }); dispatch({ type: "SET_QUICK_CANDIDATES", candidatePool: filterQuickCandidates({ x: (affect.valence! - 1) / 4, y: (affect.activation! - 1) / 4 }) }); }} onUnknown={() => dispatch({ type: "SET_QUICK_UNKNOWN" })} />}
      {session.stage === "quick-candidates" && <QuickCandidatesScreen pool={session.quickCheck?.candidatePool ?? []} selected={session.quickCheck?.selected ?? []} response={session.quickCheck?.candidateResponse} onToggle={(label) => dispatch({ type: "TOGGLE_QUICK_CANDIDATE", label })} onRespond={(response) => dispatch({ type: "SET_QUICK_CANDIDATE_RESPONSE", response })} onAddCustom={(label) => dispatch({ type: "ADD_QUICK_CUSTOM", label })} onFinish={() => dispatch({ type: "COMPLETE_QUICK" })} onCoach={() => dispatch({ type: "OPEN_GRANULARITY" })} onDeep={() => { dispatch({ type: "COMPLETE_QUICK" }); dispatch({ type: "ENTER_DEEP" }); }} />}
      {session.stage === "granularity" && <GranularityScreen selected={session.quickCheck?.selected ?? []} onChoose={(concept) => dispatch({ type: "CHOOSE_GRANULARITY", concept })} onSkip={() => dispatch({ type: "SKIP_GRANULARITY" })} />}
      {session.stage === "context-contrast" && <ContextContrastScreen concept={session.quickCheck?.concept ?? ""} onAnswer={(answer) => dispatch({ type: "SET_CONTRAST", answer })} />}
      {session.stage === "micro-learning" && <MicroLearningScreen concept={session.quickCheck?.concept ?? ""} note={getGranularityNote(session.quickCheck?.concept)} onDismiss={() => dispatch({ type: "DISMISS_MICRO_LEARNING" })} />}
      {session.stage === "quick-summary" && <QuickSummaryScreen session={session} onDeep={() => dispatch({ type: "ENTER_DEEP" })} onFeedback={(feedback) => dispatch({ type: "SET_SYNTHESIS_FEEDBACK", ...feedback })} />}
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
      {session.stage === "summary" && <SummaryScreen session={session} onFeedback={(feedback) => dispatch({ type: "SET_SYNTHESIS_FEEDBACK", ...feedback })} />}
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

function LandingScreen({ onQuick, onDeep, draft, onResume }: { onQuick: () => void; onDeep: () => void; draft: EmotionSession | null; onResume: () => void }) {
  return <Screen className="entry-screen"><p className="eyebrow">감정 관찰실</p><h1>지금의 경험을<br />조금 더 알아보기</h1><p className="lede">감정을 맞히는 검사가 아닙니다.<br />빠르게 살펴보거나, 천천히 구별해볼 수 있습니다.</p><div className="stack-actions"><button className="primary-button" onClick={onQuick}>빠르게 살펴보기 <span>→</span></button><button className="secondary-button" onClick={onDeep}>조금 더 천천히 살펴보기</button>{draft && <button className="secondary-button" onClick={onResume}>지난 기록 이어하기</button>}</div><p className="small-note">기록은 이 기기에만 저장됩니다. 언제든 건너뛰거나 닫을 수 있습니다.</p></Screen>;
}

function QuickAffectScreen({ onNext, onUnknown }: { onNext: (affect: NonNullable<QuickCheck["affect"]>) => void; onUnknown: () => void }) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const choosePoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({ x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height)) });
  };
  const toScale = (value: number) => Math.max(1, Math.min(5, Math.round(value * 4) + 1)) as Scale;
  return <Screen><StepHeading step="빠른 확인" title="지금의 경험은 어느 쪽에 가까운가요?" hint="정확한 좌표를 고를 필요 없이, ‘이쯤’이라고 느껴지는 곳을 한 번 눌러보세요." /><div className="affect-grid-wrap"><div className="affect-axis-label top">에너지가 올라온 느낌</div><div className="affect-grid" role="button" tabIndex={0} aria-label="불편함과 편안함, 가라앉음과 에너지 사이에서 현재 경험에 가까운 곳 선택" onPointerDown={choosePoint} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setPoint({ x: .5, y: .5 }); }}>{point && <span className="affect-dot" style={{ left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }} />}</div><div className="affect-axis-row"><span>불편함</span><span>편안함</span></div><div className="affect-axis-label bottom">가라앉은 느낌</div></div><div className="quick-actions"><button className="quiet-button" onClick={onUnknown}>잘 모르겠음</button><button className="primary-button" disabled={!point} onClick={() => point && onNext({ valence: toScale(point.x), activation: toScale(point.y) })}>다음 <span>→</span></button></div></Screen>;
}

/**
 * The vocabulary is far larger than one screen should show, so it opens in tiers:
 * a handful of words, then related ones on request, then the user's own wording.
 */
function TieredWords({ pool, selectedLabels, ownWords, onToggle, onAddCustom }: { pool: EmotionSelection[]; selectedLabels: string[]; ownWords: string[]; onToggle: (label: string) => void; onAddCustom: (label: string) => void }) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);
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
    </>}

    {tier === 2 && <button className="reveal-button" onClick={() => setTier(3)}>다른 표현 찾아보기 · 내 말로 적기</button>}
    {tier === 3 && <div className="own-word-row">
      <input className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustom(); }} placeholder="내 말로 적기" aria-label="내 말로 적기" />
      <button className="small-button" disabled={!custom.trim()} onClick={addCustom}>추가</button>
    </div>}
  </>;
}

function QuickCandidatesScreen({ pool, selected, response, onToggle, onRespond, onAddCustom, onFinish, onCoach, onDeep }: { pool: EmotionSelection[]; selected: EmotionSelection[]; response?: QuickNonSelection; onToggle: (label: string) => void; onRespond: (response: QuickNonSelection) => void; onAddCustom: (label: string) => void; onFinish: () => void; onCoach: () => void; onDeep: () => void }) {
  const canCoach = selected.length > 0 && selected.some((item) => Boolean(getGranularityItem(item.label)));
  return <Screen>
    <StepHeading step="가능한 표현" title="지금 경험을 표현할 때 가까울 수도 있는 말입니다." hint="감정을 판정하는 결과가 아닙니다. 여러 개를 골라도 되고, 맞지 않으면 고르지 않아도 됩니다." />
    <div className="provisional-note">임시 단어 모음 · 스스로 고른 표현만 기록됩니다</div>
    <TieredWords pool={pool} selectedLabels={selected.map((item) => item.label)} ownWords={selected.filter((item) => item.source === "custom").map((item) => item.label)} onToggle={onToggle} onAddCustom={onAddCustom} />

    <div className="quick-option-row">{([["none-close", "가까운 말이 없음"], ["unsure", "잘 모르겠음"]] as const).map(([value, label]) => <button className={`secondary-button ${response === value ? "selected" : ""}`} aria-pressed={response === value} key={value} onClick={() => onRespond(value)}>{label}</button>)}</div>
    {response && <p className="small-note">{response === "none-close" ? "가까운 말이 없다고" : "잘 모르겠다고"} 기록했습니다. 이대로 끝내도 되고, 천천히 더 살펴봐도 됩니다.</p>}

    <div className="quick-bottom-actions">
      <button className="quiet-button" onClick={onFinish}>여기까지</button>
      {canCoach ? <button className="primary-button" onClick={onCoach}>조금 더 정확히 살펴보기 <span>→</span></button> : <button className="secondary-button" onClick={onDeep}>조금 더 천천히 들여다보기</button>}
    </div>
    {canCoach && <p className="small-note">상황 비교 prototype은 일부 후보부터 제공됩니다.</p>}
  </Screen>;
}

function GranularityScreen({ selected, onChoose, onSkip }: { selected: EmotionSelection[]; onChoose: (concept: string) => void; onSkip: () => void }) {
  const available = selected.filter((item) => Boolean(getGranularityItem(item.label)));
  return <Screen><StepHeading step="조금 더 정확히" title="어느 표현을 먼저 살펴볼까요?" hint="비슷해 보이는 말도 경험에 따라 다르게 느껴질 수 있습니다." /><div className="choice-list">{available.map((item) => <button key={item.label} onClick={() => onChoose(item.label)}>{item.label}<span className="choice-arrow">→</span></button>)}</div><button className="quiet-button" onClick={onSkip}>잘 모르겠음</button></Screen>;
}

function ContextContrastScreen({ concept, onAnswer }: { concept: string; onAnswer: (answer: string) => void }) {
  const item = getGranularityItem(concept);
  if (!item) return <Screen><StepHeading step="상황 속 차이" title="이 표현을 꼭 고르지 않아도 됩니다." hint="아직 이 prototype에 상황 예시가 준비되지 않은 표현입니다." /><button className="primary-button" onClick={() => onAnswer("unknown")}>여기까지</button></Screen>;
  return <Screen><StepHeading step="상황 속 차이" title="어느 쪽이 지금 경험과 조금 더 가까운가요?" hint={item.prompt} /><div className="scenario-list">{item.scenarios.map((scenario) => <button key={scenario.id} onClick={() => onAnswer(scenario.label)}><strong>{scenario.label}.</strong><span>{scenario.text}</span></button>)}</div><div className="choice-list compact"><button onClick={() => onAnswer("여러 개")}>여러 개</button><button onClick={() => onAnswer("어느 것도 아님")}>어느 것도 아님</button><button onClick={() => onAnswer("잘 모르겠음")}>잘 모르겠음</button></div></Screen>;
}

function MicroLearningScreen({ concept, note, onDismiss }: { concept: string; note: string; onDismiss: () => void }) {
  return <Screen><p className="eyebrow">짧은 참고</p><h1>단어는 정답표가 아니라<br />살펴보는 도구입니다.</h1><p className="lede">{note || `${concept}와 같은 표현도 상황과 의미에 따라 다르게 경험될 수 있습니다.`}</p><div className="micro-card">같은 몸의 느낌도 상황에 따라 다르게 경험될 수 있습니다. 두근거림은 초조함일 수도, 기대감이나 설렘일 수도 있습니다.</div><button className="primary-button" onClick={onDismiss}>여기까지</button><button className="quiet-button" onClick={onDismiss}>나중에 읽기</button></Screen>;
}

function QuickSummaryScreen({ session, onDeep, onFeedback }: { session: EmotionSession; onDeep: () => void; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void }) {
  const quick = session.quickCheck;
  const affect = quick?.affect?.unknown ? "잘 모르겠음" : `${quickValence(quick?.affect?.valence)} · ${quickActivation(quick?.affect?.activation)}`;
  const words = (quick?.selected ?? []).map((item) => item.label).join(" · ") || quickResponseLabel(quick?.candidateResponse) || "고르지 않음";
  return <Screen><p className="eyebrow">빠른 확인</p><h1>여기까지 살펴보았습니다.</h1><div className="summary-card"><SummaryRow label="전체적인 느낌" value={affect} /><SummaryRow label="가까웠던 말" value={words} />{quick?.granularityResponse === "unsure" && <SummaryRow label="더 살펴본 표현" value="잘 모르겠음" />}{quick?.contrastAnswer && <SummaryRow label="상황 속 차이" value={quick.contrastAnswer} />}</div><p className="summary-footnote">이것은 감정의 판정이 아니라, 지금 경험을 표현해볼 수 있는 작은 단서입니다.</p><SynthesisSection session={session} onFeedback={onFeedback} /><div className="stack-actions"><a className="primary-button centered" href="/">처음으로 돌아가기</a><button className="secondary-button" onClick={onDeep}>조금 더 천천히 들여다보기</button></div></Screen>;
}

function EntryMini({ onAnswer }: { onAnswer: (answer: "yes" | "unsure" | "no") => void }) {
  return <Screen><p className="eyebrow">짧은 확인</p><h1>지금 몸은 어떤 쪽에<br />가까운가요?</h1><p className="lede">그리고 이것을 생각하는 것이 지금 도움이 될 것 같나요?</p><div className="choice-list"><button onClick={() => onAnswer("yes")}>조금 살펴보는 것이 도움될 것 같아요</button><button onClick={() => onAnswer("unsure")}>잘 모르겠어요</button><button onClick={() => onAnswer("no")}>지금은 도움이 되지 않을 것 같아요</button></div></Screen>;
}

function BodyScreen({ initial, onNext }: { initial: BodyObservation[]; onNext: (body: BodyObservation[]) => void }) {
  const [selected, setSelected] = useState(initial.map((item) => item.label));
  const [custom, setCustom] = useState(initial.find((item) => item.custom)?.label ?? "");
  const toggle = (label: string) => setSelected((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  return <Screen><StepHeading step="몸" title="먼저, 몸에서는 무엇이 느껴지나요?" hint="감정 이름을 찾기 전에 지금 몸에서 알아차릴 수 있는 것부터 봅니다." /><div className="chip-grid">{bodySignals.map((label) => <button className={`chip ${selected.includes(label) ? "selected" : ""}`} key={label} onClick={() => toggle(label)}>{label}</button>)}</div><label className="field-label" htmlFor="body-custom">다른 느낌이 있다면 적어도 됩니다</label><input id="body-custom" className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="예: 손이 차가움" /><Navigation note={stepNote("body", selected.length > 0 || custom.trim().length > 0)} onNext={() => onNext([...selected.filter((label) => label !== custom).map((label) => ({ label })), ...(custom ? [{ label: custom, custom: true }] : [])])} /></Screen>;
}

function AffectScreen({ initial, onNext }: { initial?: DeepAffect; onNext: (affect: DeepAffect) => void }) {
  const [valence, setValence] = useState<number>(initial?.valence ?? 3);
  const [activation, setActivation] = useState<number>(initial?.activation ?? 3);
  const [touched, setTouched] = useState(false);
  return <Screen><StepHeading step="전체적인 느낌" title="전체적으로 지금 경험은 어느 쪽에 가까운가요?" hint="정밀한 점수보다, 지금의 방향을 가볍게 살펴봅니다." /><Scale label="불쾌함" right="유쾌함" value={valence} onChange={(next) => { setTouched(true); setValence(next); }} /><Scale label="가라앉음" right="활성됨" value={activation} onChange={(next) => { setTouched(true); setActivation(next); }} /><Navigation note={stepNote("affect", touched)} onNext={() => onNext({ valence: valence as Scale, activation: activation as Scale })} /></Screen>;
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

function EmotionScreen({ initial, affect, onNext }: { initial: EmotionSelection[]; affect?: DeepAffect; onNext: (selected: EmotionSelection[]) => void }) {
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
  const pool = filterQuickCandidates({ x: ((affect?.valence ?? 3) - 1) / 4, y: ((affect?.activation ?? 3) - 1) / 4 });
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

function SummaryScreen({ session, onFeedback }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void }) {
  const deep = session.deepReflection;
  const quickAffect = session.quickCheck?.affect;
  return <Screen><p className="eyebrow">이번 기록에서</p><h1>여기까지 살펴보았습니다.</h1><div className="summary-card">{quickAffect && <SummaryRow label="처음 빠른 확인" value={quickAffect.unknown ? "잘 모르겠음" : `${quickValence(quickAffect.valence)} · ${quickActivation(quickAffect.activation)}`} />}<SummaryRow label="몸" value={(deep?.body ?? []).map((item) => item.label).join(" · ") || "기록하지 않음"} /><SummaryRow label="전체적인 느낌" value={`${scaleLabel(deep?.affect?.valence)} · ${activationLabel(deep?.affect?.activation)}`} /><SummaryRow label="상황" value={deep?.context?.eventText || "기록하지 않음"} /><SummaryRow label="중요했던 것" value={(deep?.concerns ?? []).join(" · ") || "기록하지 않음"} /><SummaryRow label="가까웠던 말" value={(deep?.emotionCandidates ?? []).map((item) => item.label).join(" · ") || "기록하지 않음"} /></div><p className="summary-footnote">감정의 정답을 찾은 것이 아니라, 지금 경험을 표현할 수 있는 몇 가지 단서를 남겼습니다.</p><SynthesisSection session={session} onFeedback={onFeedback} /><a className="secondary-button centered" href="/">처음으로 돌아가기</a></Screen>;
}

function SynthesisSection({ session, onFeedback }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void }) {
  const synthesis = buildSynthesis(session);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState(session.synthesisFeedback?.correction ?? "");
  const fit = session.synthesisFeedback?.fit;
  if (!hasSynthesis(synthesis)) return null;
  return <section className="synthesis">
    <h2 className="synthesis-title">지금까지의 경험을<br />이렇게 정리해볼 수 있어요</h2>
    <p className="synthesis-lead">{synthesis.lead}</p>
    <ul className="synthesis-lines">{synthesis.lines.map((line) => <li key={line.id}>{line.text}</li>)}</ul>
    {synthesis.comparison.length > 0 && <>
      <p className="tier-label">처음과 지금</p>
      <ul className="synthesis-lines">{synthesis.comparison.map((line) => <li key={line.id}>{line.text}</li>)}</ul>
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

function StoppedScreen({ session }: { session: EmotionSession }) { return <Screen className="entry-screen"><p className="eyebrow">여기까지</p><h1>지금은 더 살펴보지<br />않아도 됩니다.</h1><p className="lede">경험에서 조금 거리를 두는 것도 선택입니다. 이 기록은 완료된 기록이 아니라, 중단한 기록으로 이 기기에 남습니다.</p><div className="stack-actions"><a className="primary-button centered" href="/">기록실로 돌아가기</a><button className="quiet-button" onClick={() => { removeDraft(); window.location.reload(); }}>이 기록을 지우기</button></div>{session.stopReason === "entry" && <p className="small-note">물 한 잔, 잠깐 걷기, 다른 일로 주의를 옮기기처럼 지금 가능한 것을 선택해보세요.</p>}</Screen>; }

function StopModal({ onClose, onStop }: { onClose: () => void; onStop: () => void }) { return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><p className="eyebrow">잠깐 확인할게요</p><h2>지금 더 생각하는 것이<br />도움이 되고 있나요?</h2><p>여기까지 알아차린 것으로 충분할 수 있습니다.</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>계속 살펴보기</button><button className="primary-button" onClick={onStop}>여기서 그만하기</button></div></div></div>; }

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`screen ${className}`}>{children}</section>; }
function StepHeading({ step, title, hint }: { step: string; title: string; hint: string }) { return <><p className="eyebrow">{step}</p><h1>{title}</h1><p className="hint">{hint}</p></>; }
function Navigation({ onNext, disabled = false, note }: { onNext: () => void; disabled?: boolean; note?: string }) {
  return <><StepNote note={note} /><div className="navigation"><button className="skip-button" onClick={onNext}>건너뛰기</button><button className="primary-button" disabled={disabled} onClick={onNext}>다음 <span>→</span></button></div></>;
}
function StepNote({ note }: { note?: string }) { return note ? <p className="step-note" role="note">{note}</p> : null; }
function Scale({ label, right, value, onChange }: { label: string; right: string; value: number; onChange: (value: number) => void }) { return <div className="scale"><div className="scale-labels"><span>{label}</span><span>{right}</span></div><input aria-label={`${label}에서 ${right}`} type="range" min="1" max="5" value={value} onChange={(event) => onChange(Number(event.target.value))} /><div className="scale-dots"><span>낮음</span><span>중간</span><span>높음</span></div></div>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>; }
type GranularityItem = { prompt: string; scenarios: Array<{ id: string; label: string; text: string }>; note: string };
function getGranularityItem(concept?: string): GranularityItem | undefined { return concept ? (granularity.items as Record<string, GranularityItem>)[concept] : undefined; }
function getGranularityNote(concept?: string) { return getGranularityItem(concept)?.note ?? "같은 몸의 느낌도 상황과 의미에 따라 다르게 경험될 수 있습니다."; }
function quickAffectSuggestion(session: EmotionSession): DeepAffect | undefined {
  const affect = session.quickCheck?.affect;
  if (!affect || affect.unknown) return undefined;
  return { valence: affect.valence, activation: affect.activation };
}
function quickResponseLabel(response?: QuickNonSelection) { return response === "none-close" ? "가까운 말이 없음" : response === "unsure" ? "잘 모르겠음" : ""; }
const stepNote = (step: keyof typeof stepNotes.steps, shown: boolean) => (shown ? stepNotes.steps[step] : undefined);
