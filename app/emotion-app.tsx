"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { canGoBack, createSession, sessionReducer, understandRoute } from "../lib/session-types";
import { appraisalEscapes, coachEscapes, coachResult, coachSetFor, getCoachSets } from "../lib/coach";
import type { AffectPoint, BodyObservation, DeepReflection, EmotionSelection, EmotionSession, QuickNonSelection, SynthesisFit, TalkToSomeone, UnderlyingFeeling } from "../lib/session-types";

type DeepContext = NonNullable<DeepReflection["context"]>;
type DeepOutcome = NonNullable<DeepReflection["outcome"]>;
import { getStorageAdapter } from "../lib/storage-adapter";
import { applyImport, buildExport, downloadExport, downloadJson, exportFileName, MAX_IMPORT_BYTES, parseImport, planImport, readFileText, type ImportError, type ImportPlan } from "../lib/record-transfer";
import { isLockedText, lockedFileName, lockExport, MIN_PASSPHRASE_LENGTH, unlockExport } from "../lib/record-crypto";
import { concernLines, formatDay, formatWhen, helpedOptions, mapPoints, previousLines, previousRecord, recentDays, summarise, triedOptions, wordLines, type SourceKind, type WordHow } from "../lib/records";
import { migrateLegacyStorage } from "../lib/migrations";
import { expandCandidates, filterQuickCandidates, showsPauseLine } from "../lib/quick-check";
import { activationLabel, hasAffectPoint, quickActivation, quickValence, scaleLabel } from "../lib/affect-labels";
import { buildSynthesis, hasSynthesis } from "../lib/synthesis";
import { requireContent, type LocaleContent } from "../lib/content";
import { INPUT_LIMITS } from "../lib/limits";
import { CONTACTS_CHECKED_ON, parseTerms, PRIVACY_PATH, TERMS_EFFECTIVE, TERMS_MAIL, TERMS_PATH, type Terms, type TermsBlock, type TermsPiece } from "../lib/terms";
import { koOnly } from "../lib/i18n/messages.ko";
import { interpolate } from "../lib/i18n/format";
import { WORDS_PATH, wordId, type WordCard } from "../lib/words";
import { DEFAULT_LOCALE, type Locale } from "../lib/i18n/locale";
import { englishAvailable } from "../lib/i18n/availability";
import { I18nProvider, renderRich, useT } from "../lib/i18n/react";
import type { Translate } from "../lib/i18n/t";
import { toneOf } from "../lib/tones";
import { enOnly } from "../lib/i18n/messages.en";
import { SiteLogo } from "./site-logo";

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
export default function EmotionApp({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  return <I18nProvider locale={locale}><App /></I18nProvider>;
}

function App() {
  const t = useT();
  const [session, dispatch] = useReducer(sessionReducer, undefined, createSession);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<EmotionSession | null>(null);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [records, setRecords] = useState<EmotionSession[] | null>(null);
  const [openRecord, setOpenRecord] = useState<EmotionSession | null>(null);
  // true after the browser refused a write (quota full, storage blocked): the steps still work, the record is just not kept
  const [saveFailed, setSaveFailed] = useState(false);
  // the helplines on every step, one tap away (SAFETY.md): a fixed card, no judgement of risk
  const [helpOpen, setHelpOpen] = useState(false);

  // 기록 관리 starts open when the records were opened from 기록 보기·지우기 (2026-11-05)
  const [manageOpen, setManageOpen] = useState(false);
  const showRecords = (manage = false) => { setManageOpen(manage); setRecords(loadCompleted()); setOpenRecord(null); };
  const saveFollowUp = (session: EmotionSession, followUp: NonNullable<NonNullable<EmotionSession["support"]>["followUp"]>) => {
    // written straight to the completed store, which upserts by id; the reducer
    // session is on the landing screen here, so nothing can clobber it
    const next = { ...session, support: { ...(session.support ?? { chosen: [] }), followUp: { ...session.support?.followUp, ...followUp, at: new Date().toISOString() } } };
    saveCompleted(next);
    setOpenRecord(next);
    setRecords(loadCompleted());
  };
  // a name given later is added through the reducer, which only ever appends it, and saved like the follow-up
  const addLabelLater = (session: EmotionSession, label: string) => {
    const next = sessionReducer(session, { type: "ADD_LABEL_LATER", id: session.id, label });
    if (next === session) return;
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
    setSaveFailed(!persistSession(session));
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

  // option B: a quiet paper colour per step, set on <html> so the whole page follows (lib/tones.ts)
  const tone = toneOf(session.stage, Boolean(records || openRecord));
  useEffect(() => {
    document.documentElement.dataset.tone = tone;
  }, [tone]);

  const resume = () => {
    if (draft) dispatch({ type: "RESUME", session: draft });
  };

  // one draft slot: a new start would overwrite it, so with a draft waiting it asks first
  const [pendingStart, setPendingStart] = useState<"quick" | "deep" | null>(null);
  const begin = (kind: "quick" | "deep") => dispatch({ type: kind === "quick" ? "START_QUICK" : "START_DEEP", locale: t.locale });
  const askToStart = (kind: "quick" | "deep") => draft ? setPendingStart(kind) : begin(kind);
  const discardAndStart = () => {
    if (!pendingStart) return;
    removeDraft();
    setDraft(null);
    setPendingStart(null);
    begin(pendingStart);
  };

  if (session.stage === "landing") {
    // the homepage frame (header, menu, footer) on the landing and record screens only;
    // the steps keep their minimal top bar so nothing pushes the task down (docs/DESIGN_ALIGNMENT.md §5)
    return <div className="app-shell site-frame">
      <a className="skip-link" href="#main">{t("shell.skipToContent")}</a>
      <SiteHeader onHelp={() => setHelpOpen(true)} />
      <main id="main" tabIndex={-1} className="site-main">
      {openRecord
        ? <RecordDetail session={openRecord} previous={previousRecord(openRecord, records ?? loadCompleted())} onHelp={() => setHelpOpen(true)} onFollowUp={(followUp) => saveFollowUp(openRecord, followUp)} onAddLabel={(label) => addLabelLater(openRecord, label)} onBack={() => setOpenRecord(null)} />
        : records
          ? <RecordsScreen records={records} manageOpen={manageOpen} onHelp={() => setHelpOpen(true)} onOpen={setOpenRecord} onBack={() => setRecords(null)} onChanged={() => { setRecords(loadCompleted()); setDraft(loadDraft()); }} />
          : <LandingScreen onStart={() => askToStart("quick")} draft={draft} onResume={resume} onRecords={() => showRecords()} onManage={() => showRecords(true)} pendingStart={pendingStart} onDiscardAndStart={discardAndStart} onCancelStart={() => setPendingStart(null)} />}
      </main>
      <SiteFooter />
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>;
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
          {canGoBack(session) && <button className="text-button" aria-label={t("common.stepBack")} onClick={() => dispatch({ type: "BACK" })}><span className="label-wide">{t("common.stepBack")}</span><span className="label-narrow" aria-hidden="true">{t("common.stepBackShort")}</span></button>}
          {/* the helplines, one tap away on every step and always in view (SAFETY.md; owner's choice 2026-10-19) */}
          <button className="text-button help-button" aria-label={t("common.helpLink")} onClick={() => setHelpOpen(true)}><span className="label-wide">{t("common.helpLink")}</span><span className="label-narrow" aria-hidden="true">{t("common.helpShort")}</span></button>
          {session.stage !== "entry" && session.stage !== "stopped" && session.stage !== "summary" && session.stage !== "quick-summary" && session.stage !== "support" && (
            <button className="text-button" onClick={() => setStopConfirm(true)}>{t("common.stop")}</button>
          )}
        </div>
      </header>

      {saveFailed && <p className="save-warning" role="status">{t("common.saveFailed")}</p>}
      {/* the person's own spot in the unpleasant, high-energy corner (lib/quick-check PAUSE_LINE_CORNER): one plain line at the top of the second step, no warning colour, nothing else changes */}
      {session.stage === "quick-candidates" && showsPauseLine(session.quickCheck?.affect) && <p className="pause-line pause-line-banner">{t("quickCandidates.pause")}</p>}

      {progress[session.stage] && (
        <div className="progress-row" aria-label={t("common.progress", { step: progress[session.stage] })}>
          <span>{progress[session.stage]}</span>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(Object.keys(progress).indexOf(session.stage) + 1) * 16.66}%` }} /></div>
        </div>
      )}

      {session.stage === "quick-affect" && <QuickAffectScreen onNext={(affect) => { dispatch({ type: "SET_QUICK_AFFECT", affect }); dispatch({ type: "SET_QUICK_CANDIDATES", candidatePool: filterQuickCandidates({ x: affect.valence ?? 0.5, y: affect.activation ?? 0.5 }, undefined, t.locale) }); }} onUnknown={() => dispatch({ type: "SET_QUICK_UNKNOWN" })} />}
      {session.stage === "quick-candidates" && <QuickCandidatesScreen pool={session.quickCheck?.candidatePool ?? []} selected={session.quickCheck?.selected ?? []} response={session.quickCheck?.candidateResponse} revealed={Boolean(session.quickCheck?.wordsRevealed)} onReveal={() => dispatch({ type: "REVEAL_QUICK_WORDS" })} onToggle={(label) => dispatch({ type: "TOGGLE_QUICK_CANDIDATE", label })} onRespond={(response) => dispatch({ type: "SET_QUICK_CANDIDATE_RESPONSE", response })} onAddCustom={(label) => dispatch({ type: "ADD_QUICK_CUSTOM", label })} onMeaning={(label, meaning) => dispatch({ type: "SET_PERSONAL_MEANING", label, meaning })} eventText={session.quickCheck?.context?.eventText ?? ""} onEventText={(eventText) => dispatch({ type: "SET_QUICK_CONTEXT", eventText })} onFinish={() => dispatch({ type: "COMPLETE_QUICK" })} onCoach={() => dispatch({ type: "OPEN_GRANULARITY" })} onDeep={() => { dispatch({ type: "COMPLETE_QUICK" }); dispatch({ type: "ENTER_DEEP" }); }} />}
      {session.stage === "coach-appraisal" && <CoachAppraisalScreen session={session} onToggle={(id) => dispatch({ type: "TOGGLE_APPRAISAL", id })} onOwn={(label) => dispatch({ type: "SET_OWN_APPRAISAL", label })} onNext={() => dispatch({ type: "GO_TO_COACH_WORDS" })} onLeave={() => dispatch({ type: "CLOSE_COACH" })} />}
      {session.stage === "coach-words" && <CoachWordsScreen session={session} onToggle={(label) => dispatch({ type: "TOGGLE_COACH_WORD", label })} onOwnWord={(label) => dispatch({ type: "SET_COACH_OWN_WORD", label })} onNext={() => dispatch({ type: "FINISH_COACH" })} onLeave={() => dispatch({ type: "CLOSE_COACH" })} />}
      {session.stage === "coach-note" && <CoachNoteScreen session={session} onDone={() => dispatch({ type: "CLOSE_COACH" })} />}
      {session.stage === "quick-summary" && <QuickSummaryScreen session={session} onDeep={() => dispatch({ type: "ENTER_DEEP" })} onFeedback={(feedback) => dispatch({ type: "SET_SYNTHESIS_FEEDBACK", ...feedback })} onSupport={() => dispatch({ type: "OPEN_SUPPORT" })} />}
      {session.stage === "entry" && (
        <EntryScreen draft={draft} onStart={() => dispatch({ type: "SET_ENTRY", decision: "observe" })} onUnsure={() => dispatch({ type: "SET_ENTRY", decision: "unsure" })} onStop={() => dispatch({ type: "SET_ENTRY", decision: "stop" })} onResume={resume} />
      )}
      {session.stage === "entry-mini" && <EntryMini onAnswer={(helpful) => dispatch({ type: "SET_ENTRY_MINI", helpful })} />}
      {session.stage === "body" && <BodyScreen initial={session.deepReflection?.body ?? []} onNext={(body) => dispatch({ type: "SET_BODY", body })} />}
      {session.stage === "affect" && <AffectScreen initial={session.deepReflection?.affect ?? quickAffectSuggestion(session)} fromQuick={!session.deepReflection?.affect && Boolean(quickAffectSuggestion(session))} onNext={(affect) => dispatch({ type: "SET_AFFECT", affect })} />}
      {session.stage === "context" && <ContextScreen initial={session.deepReflection?.context} onNext={(context) => dispatch({ type: "SET_CONTEXT", context })} />}
      {session.stage === "meaning" && <MeaningScreen initial={session.deepReflection?.concerns ?? []} onNext={(selected) => dispatch({ type: "SET_CONCERNS", concerns: selected })} />}
      {session.stage === "emotion" && <EmotionScreen initial={session.deepReflection?.emotionCandidates ?? []} affect={session.deepReflection?.affect} revealed={Boolean(session.deepReflection?.wordsRevealed)} onReveal={() => dispatch({ type: "REVEAL_DEEP_WORDS" })} onNext={(selected) => dispatch({ type: "SET_EMOTIONS", emotionCandidates: selected })} />}
      {session.stage === "outcome" && <OutcomeScreen onNext={(outcome) => dispatch({ type: "SET_OUTCOME", outcome })} />}
      {session.stage === "summary" && <SummaryScreen session={session} onFeedback={(feedback) => dispatch({ type: "SET_SYNTHESIS_FEEDBACK", ...feedback })} onTalk={(answer) => dispatch({ type: "SET_TALK_TO_SOMEONE", answer })} onUnderlying={(answer) => dispatch({ type: "SET_UNDERLYING_FEELING", answer })} onUnderlyingNote={(note) => dispatch({ type: "SET_UNDERLYING_NOTE", note })} onSupport={() => dispatch({ type: "OPEN_SUPPORT" })} />}
      {session.stage === "support" && <NeedScreen session={session} onNeed={(id) => dispatch({ type: "CHOOSE_NEED", id })} onResponse={(id) => dispatch({ type: "TOGGLE_RESPONSE", id })} onDeep={() => dispatch({ type: "ENTER_DEEP" })} onCoach={() => dispatch({ type: "OPEN_COACH" })} onBack={() => dispatch({ type: "BACK" })} />}
      {session.stage === "stopped" && <StoppedScreen session={session} />}

      {stopConfirm && <StopModal onClose={() => setStopConfirm(false)} onStop={stop} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </main>
  );
}

/** The homepage this app belongs to. Menu links open there, in the same tab. */
const HOMEPAGE = "https://eunchanjoe.vercel.app";
/** `en`: the homepage's English reading, where it has one (only /en/me/ answered 200 on 2026-11-10; /en/reading/, /en/threads/, /en/map/ were 404). */
const HOMEPAGE_NAV: { href: string; en?: string; label: string }[] = [
  { href: `${HOMEPAGE}/me/`, en: `${HOMEPAGE}/en/me/`, label: "Me" },
  { href: `${HOMEPAGE}/reading/`, label: "Reading" },
  { href: `${HOMEPAGE}/threads/`, label: "Threads" },
  { href: `${HOMEPAGE}/map/`, label: "Map" },
];

/**
 * On the English screen, the mark after a link that opens a page in Korean:
 * a small "KO" for the eye and "(in Korean)" for screen readers. Nothing on
 * the Korean screen. Use with `koreanLink(locale)` on the same link.
 */
function KoreanMark() {
  const t = useT();
  if (t.locale !== "en") return null;
  return <span className="ko-mark"><span aria-hidden="true">{enOnly.koreanMark.short}</span><span className="visually-hidden">{enOnly.koreanMark.label}</span></span>;
}

/** hrefLang="ko" for a link from the English screen to a page in Korean. */
function koreanLink(locale: string) {
  return locale === "en" ? { hrefLang: "ko" } : {};
}

/**
 * The homepage's header: its wordmark and menu, as on eunchanjoe.vercel.app,
 * and the same help button the steps carry, so the helplines are one tap away
 * before anything is started too (SAFETY.md).
 */
function SiteHeader({ onHelp }: { onHelp: () => void }) {
  const t = useT();
  return <header className="site-header">
    <a className="site-logo" href={`${HOMEPAGE}/`} {...koreanLink(t.locale)}><SiteLogo /><span className="site-logo-text">Eunchan Joe</span><KoreanMark /></a>
    <nav className="site-nav" aria-label={t("shell.siteNav")}>
      <ul>{HOMEPAGE_NAV.map((item) => {
        const toKorean = t.locale === "en" && !item.en;
        return <li key={item.href}><a href={t.locale === "en" && item.en ? item.en : item.href} {...(toKorean ? { hrefLang: "ko" } : {})}>{item.label}{toKorean && <KoreanMark />}</a></li>;
      })}</ul>
    </nav>
    {/* the other language, only where it is open: development always, production once the owner has reviewed it */}
    <button className="text-button help-button" aria-label={t("common.helpLink")} onClick={onHelp}><span className="label-wide">{t("common.helpLink")}</span><span className="label-narrow" aria-hidden="true">{t("common.helpShort")}</span></button>
    {englishAvailable() && <a className="lang-switch" href={t.locale === "ko" ? "/en" : "/"} lang={t.locale === "ko" ? "en" : "ko"} hrefLang={t.locale === "ko" ? "en" : "ko"}>{t("shell.otherLanguage")}</a>}
  </header>;
}

/** A small footer: the app, its maker, the way back, the terms and the privacy policy. No mail address, no licence line. */
function SiteFooter() {
  const t = useT();
  return <footer className="site-footer">
    <span>{t("common.appName")}</span>
    <span aria-hidden="true">·</span>
    <span>{t("shell.owner")}</span>
    <span aria-hidden="true">·</span>
    <a href={`${HOMEPAGE}/`} {...koreanLink(t.locale)}>eunchanjoe.vercel.app<KoreanMark /></a>
    {/* the terms and the policy are Korean only for now (lib/terms.ts): the English footer links to the Korean pages, marked hrefLang="ko" (2026-11-10) */}
    {t.locale === "ko"
      ? <><span aria-hidden="true">·</span><a href={TERMS_PATH}>{koOnly.termsLink}</a><span aria-hidden="true">·</span><a href={PRIVACY_PATH}>{koOnly.privacyLink}</a></>
      : <><span aria-hidden="true">·</span><a href={TERMS_PATH} hrefLang="ko">{enOnly.termsLink}<KoreanMark /></a><span aria-hidden="true">·</span><a href={PRIVACY_PATH} hrefLang="ko">{enOnly.privacyLink}<KoreanMark /></a></>}
  </footer>;
}

/**
 * /terms: the terms of use (docs/TERMS.md) in the same frame as the landing,
 * with the help button and the footer. Korean only. The text comes from
 * data/terms.ko.json through the page, so the app's own screens do not carry it.
 */
export function TermsPage({ terms }: { terms: Terms }) {
  return <I18nProvider locale="ko"><TermsFrame terms={terms} /></I18nProvider>;
}

function TermsFrame({ terms }: { terms: Terms }) {
  const t = useT();
  const [helpOpen, setHelpOpen] = useState(false);
  return <div className="app-shell site-frame">
    <a className="skip-link" href="#main">{t("shell.skipToContent")}</a>
    <SiteHeader onHelp={() => setHelpOpen(true)} />
    <main id="main" tabIndex={-1} className="site-main">
      <article className="terms">
        <p className="terms-back"><a href="/"><span aria-hidden="true">← </span>{t("common.backToStart")}</a></p>
        <h1>{terms.title}</h1>
        <p className="terms-intro"><TermsText text={terms.intro} /></p>
        {terms.sections.map((section) => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          {section.blocks.map((block, index) => <TermsBlockView key={index} block={block} />)}
          {section.id === "changes" && <ul>{terms.changes.map((change) => <li key={change.date + change.text}>{change.date}: <TermsText text={change.text} /></li>)}</ul>}
        </section>)}
      </article>
    </main>
    <SiteFooter />
    {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
  </div>;
}

/**
 * /words: every word on one page, in 가나다 order (lib/words.ts), in the same
 * frame as the terms, with the crisis card under the list. Korean only. Printed,
 * the header, help button, footer and crisis card stay on the paper too.
 */
export function WordsPage({ cards }: { cards: WordCard[] }) {
  return <I18nProvider locale="ko"><WordsFrame cards={cards} /></I18nProvider>;
}

function WordsFrame({ cards }: { cards: WordCard[] }) {
  const t = useT();
  const [helpOpen, setHelpOpen] = useState(false);
  const w = koOnly.words;
  return <div className="app-shell site-frame">
    <a className="skip-link" href="#main">{t("shell.skipToContent")}</a>
    <SiteHeader onHelp={() => setHelpOpen(true)} />
    <main id="main" tabIndex={-1} className="site-main">
      <article className="terms words-page">
        <p className="terms-back"><a href="/"><span aria-hidden="true">← </span>{t("common.backToStart")}</a></p>
        <h1>{w.title}</h1>
        <p className="terms-intro">{interpolate(w.intro, { count: cards.length })}</p>
        <p className="words-print"><button className="small-button" onClick={() => window.print()}>{w.print}</button></p>
        <ul className="words-list">
          {cards.map((card) => <li key={card.label} id={wordId(card.label)} className="word-card">
            <h2>{card.label}</h2>
            {card.aliases.length > 0 && <p className="word-aliases">{interpolate(w.aliases, { words: card.aliases.join(", ") })}</p>}
            {card.hints.length > 0 && <>
              <h3>{w.hints}</h3>
              <ul>{card.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
            </>}
            {card.neighbors.length > 0 && <>
              <h3>{w.neighbors}</h3>
              <p className="word-neighbors">{card.neighbors.map((label, index) => <span key={label}>{index > 0 && ", "}<a href={`#${wordId(label)}`}>{label}</a></span>)}</p>
            </>}
            {card.expressions.length > 0 && <>
              <h3>{t("words.alsoSaidAs")}</h3>
              <p>{card.expressions.join(", ")}</p>
              <p className="word-source">{t("words.expressionSource")}</p>
            </>}
          </li>)}
        </ul>
      </article>
      <CrisisCard />
    </main>
    <SiteFooter />
    {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
  </div>;
}

function TermsBlockView({ block }: { block: TermsBlock }) {
  if (typeof block === "string") return <p><TermsText text={block} /></p>;
  if ("list" in block) return <ul>{block.list.map((item, index) => <li key={index}><TermsText text={item} /></li>)}</ul>;
  return <ol>{block.ordered.map((item, index) => <li key={index}><TermsText text={item} /></li>)}</ol>;
}

/** A terms sentence: the dates from lib/terms.ts, the numbers from the crisis card's own messages, each one a tel: link. */
function TermsText({ text }: { text: string }) {
  const t = useT();
  const draw = (piece: TermsPiece, index: number): React.ReactNode => {
    switch (piece.kind) {
      case "text": return piece.text;
      case "bold": return <strong key={index}>{piece.pieces.map(draw)}</strong>;
      case "date": return piece.which === "effective" ? TERMS_EFFECTIVE : CONTACTS_CHECKED_ON;
      case "line": return <a key={index} className="terms-tel" href={t(`crisis.href${piece.line}`)}>{t(`crisis.num${piece.line}`)}</a>;
      case "link": return <a key={index} href={piece.to === "mail" ? TERMS_MAIL : `${HOMEPAGE}/`}>{piece.text}</a>;
    }
  };
  return <>{parseTerms(text).map(draw)}</>;
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

/**
 * One way in (owner's decision 2026-10-30, docs/EVIDENCE_CHAIN.md §7): the first
 * screen holds a title, a subtitle, 지금 기록 and a small link to past entries.
 * 지금 기록 is the quick look; the slower look is reached from inside it, at the
 * end of its second step and on its summary. Everything else sits below the fold.
 */
function LandingScreen({ onStart, draft, onResume, onRecords, onManage, pendingStart, onDiscardAndStart, onCancelStart }: { onStart: () => void; draft: EmotionSession | null; onResume: () => void; onRecords: () => void; onManage: () => void; pendingStart: "quick" | "deep" | null; onDiscardAndStart: () => void; onCancelStart: () => void }) {
  const t = useT();
  const confirmTitle = useRef<HTMLParagraphElement>(null);
  // the question takes the focus, so it is read before the choice is made
  useEffect(() => { if (pendingStart) confirmTitle.current?.focus(); }, [pendingStart]);
  return <Screen className="entry-screen">
    <section className="card hero-card single-entry">
      {/* a drawing of the pad used in the steps: four quiet colours and one dot (decoration only) */}
      <div className="hero-pad" aria-hidden="true"><span className="hero-dot" /></div>
      {/* the app's name is the screen's title and its largest text, so a first visitor knows where they are (2026-11-10);
          the nickname 이쯤 sits under it, Korean only; the old title sentence follows as the hero's line */}
      <h1 className="hero-name">{t("common.appName")}</h1>
      {t.locale === "ko" && <p className="hero-alias">{koOnly.alias}</p>}
      <p className="hero-title">{renderRich(t("landing.title"))}</p>
      <p className="lede">{renderRich(t("landing.lede"))}</p>
      {pendingStart
        ? <div className="draft-confirm" role="group" aria-labelledby="draft-confirm-title">
            <p className="synthesis-question" id="draft-confirm-title" ref={confirmTitle} tabIndex={-1}>{t("landing.draftConfirm.title")}</p>
            <p className="small-note">{t("landing.draftConfirm.body")}</p>
            <div className="stack-actions">
              <button className="primary-button" onClick={onResume}>{t("landing.draftConfirm.resume")}</button>
              <button className="secondary-button" onClick={onDiscardAndStart}>{t("landing.draftConfirm.discard")}</button>
              <button className="quiet-button" onClick={onCancelStart}>{t("landing.draftConfirm.cancel")}</button>
            </div>
          </div>
        : <div className="stack-actions">
            <button className="primary-button start-button" onClick={onStart}>{t("landing.start")} <span>→</span></button>
            <button className="inline-link records-link" onClick={onRecords}>{t("landing.records")}</button>
          </div>}
    </section>

    {draft && !pendingStart && <div className="resume-card"><div><strong>{t("entry.resumeTitle")}</strong><span>{t("entry.resumeBody")}</span></div><button className="small-button" onClick={onResume}>{t("landing.resume")}</button></div>}
    <SplitFigure />
    <div className="privacy-note">
      <span aria-hidden="true">💻</span>
      <span>{t("landing.storageNote")} <button className="inline-link" onClick={onManage}>{t("landing.storageManage")}</button></span>
    </div>

    <div className="why-section">
      <WhyThis />
      <WhyWords />
    </div>

    <AboutTool />
    <CrisisCard />
    <NextStep />
  </Screen>;
}

/**
 * Under the buttons (2026-11-05): the 답답함 example from the fold above, drawn.
 * One word splits into two kinds, each with what it calls for. The lines draw
 * themselves once per page load, in about a second; with reduced motion they are
 * simply there. The words are real text, read in order; the lines are decoration.
 * No colour per feeling (§19): one ink, one line weight.
 */
function SplitFigure() {
  const t = useT();
  const play = useFirstReveal("landing:split");
  const branch = (kind: "tired" | "stuck") => <li className="split-branch">
    <span className="split-kind">{t(`landing.split.${kind}`)}</span>
    <svg className="split-stem" viewBox="0 0 2 24" aria-hidden="true"><path d="M1 0 V24" /></svg>
    <span className="split-need">{t(`landing.split.${kind}Need`)}</span>
  </li>;
  return <figure className={`split-figure${play ? " split-play" : ""}`}>
    <p className="split-word"><span>{t("landing.split.word")}</span></p>
    <svg className="split-lines" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M100 0 C100 22 50 18 50 40" />
      <path d="M100 0 C100 22 150 18 150 40" />
    </svg>
    <ul className="split-branches">{branch("tired")}{branch("stuck")}</ul>
    <figcaption className="split-line">{t("landing.split.line")}</figcaption>
  </figure>;
}

/** The question each step asks, in the order it is met; the preview on the landing lists them from the same messages the steps use. */
const PREVIEW_QUICK = ["quickAffect.title", "quickCandidates.title"] as const;
const PREVIEW_DEEP = ["body.title", "affect.title", "context.title", "meaning.title", "emotion.title", "outcome.title"] as const;

const REFERENCES = ["vedernikova", "widdershoven", "hoemann", "fugate", "dejonckheere", "thompson"] as const;
const QUESTIONS = ["judge", "ai", "storage", "maker", "often", "worse", "body", "effect"] as const;
/** Each checked against Crossref on 2026-10-13; the same DOIs are in docs/EVIDENCE_CHAIN.md. */
const REFERENCE_DOI: Record<(typeof REFERENCES)[number], string> = {
  vedernikova: "10.3389/fpsyg.2021.703757",
  widdershoven: "10.1016/j.jad.2018.10.092",
  hoemann: "10.3389/fpsyg.2021.704125",
  fugate: "10.64898/2026.08.12.744382",
  dejonckheere: "10.1038/s41562-019-0555-0",
  thompson: "10.1111/spc3.12584",
};
/**
 * The day each study was last looked at again: publication status and any correction or
 * retraction notice on Crossref (docs/KNOWLEDGE_DURABILITY.md, owner approval 2026-10-25).
 * Update the date only after actually re-checking; log what changed in docs/EVIDENCE_CHAIN.md.
 */
const REFERENCE_CHECKED_ON: Record<(typeof REFERENCES)[number], string> = {
  vedernikova: "2026-10-25",
  widdershoven: "2026-10-25",
  hoemann: "2026-10-25",
  fugate: "2026-10-25",
  dejonckheere: "2026-10-25",
  thompson: "2026-10-25",
};
const dayParts = (iso: string) => { const [year, month, day] = iso.split("-"); return { year, month, day }; };
const LAST_CHECKED = Object.values(REFERENCE_CHECKED_ON).sort().at(-1) ?? "";

/**
 * Below the "why" folds and above the crisis card: what the tool is, the studies
 * behind it with their limits (docs/EVIDENCE_CHAIN.md), and common questions.
 * The "not a crisis service" sentence comes last so the crisis card follows it
 * directly. The lists start folded; each item rises in as it is shown.
 */
function AboutTool() {
  const t = useT();
  // the practitioner fold, the brain map line and the word list link were Korean only until 2026-11-10;
  // their English is a draft the owner has not read (lib/i18n/messages.en.ts enOnly, docs/EN_REVIEW.md),
  // so each English block ends with one small line saying so
  const practitioner = t.locale === "ko" ? koOnly.practitioner : enOnly.practitioner;
  const draftNote = t.locale === "en" ? <p className="draft-note">{enOnly.draftNote}</p> : null;
  return <section className="about" aria-labelledby="about-title">
    <h2 id="about-title">{t("about.title")}</h2>
    <p>{t("about.what")}</p>
    <details className="about-fold">
      <summary>{t("about.previewSummary")}</summary>
      <p className="about-intro">{t("about.previewIntro")}</p>
      <div className="about-list preview-list">
        <h3>{t("about.previewQuick")}</h3>
        <ol>{PREVIEW_QUICK.map((key, index) => <li key={key} style={{ "--rise-order": index } as CSSProperties}>{t(key).replace(/\n/g, " ")}</li>)}</ol>
        <h3>{t("about.previewDeep")}</h3>
        <ol>{PREVIEW_DEEP.map((key, index) => <li key={key} style={{ "--rise-order": index + PREVIEW_QUICK.length } as CSSProperties}>{t(key).replace(/\n/g, " ")}</li>)}</ol>
      </div>
    </details>
    <details className="about-fold">
      <summary>{t("about.refsSummary")}</summary>
      <p className="about-intro">{t("about.refsIntro")}</p>
      <p className="about-intro about-checked-all">{t("about.refsChecked", dayParts(LAST_CHECKED))}</p>
      <ol className="about-list">
        {REFERENCES.map((id, index) => <li key={id} style={{ "--rise-order": index } as CSSProperties}>
          <p className="about-cite">{t(`about.refs.${id}.cite`)} <a href={`https://doi.org/${REFERENCE_DOI[id]}`} target="_blank" rel="noopener noreferrer">{t("about.doiLink")}</a></p>
          <p className="about-kind">{t(`about.refs.${id}.kind`)}</p>
          <p className="about-checked">{t("about.checkedOn", dayParts(REFERENCE_CHECKED_ON[id]))}</p>
          <p><strong>{t("about.found")}</strong> {t(`about.refs.${id}.found`)}</p>
          <p><strong>{t("about.limit")}</strong> {t(`about.refs.${id}.limit`)}</p>
        </li>)}
      </ol>
      <p className="why-principle">{renderRich(t("about.refsClosing"))}</p>
      {/* the homepage brain map links back here; the map is in Korean, and the English line says so (draft, 2026-11-10) */}
      <p className="about-intro">{t("about.atlasLead")} <a href={`${HOMEPAGE}/map/brain/`} {...koreanLink(t.locale)}>{t("about.atlasLink")}<KoreanMark /> →</a></p>
      {draftNote}
    </details>
    <details className="about-fold">
      <summary>{practitioner.summary}</summary>
      <ul className="about-list">
        {practitioner.lines.map((line, index) => <li key={index} style={{ "--rise-order": index } as CSSProperties}><p>{line}</p></li>)}
        <li style={{ "--rise-order": practitioner.lines.length } as CSSProperties}><p className="about-mail">{practitioner.mailBefore}<a href={`mailto:${koOnly.practitioner.mailAddress}`}>{koOnly.practitioner.mailAddress}</a>{practitioner.mailAfter}</p></li>
      </ul>
      {draftNote}
    </details>
    {/* /words is in Korean only; the English link says so and carries hrefLang="ko", as the footer's links do */}
    <p className="about-words"><a href={WORDS_PATH} {...(t.locale === "en" ? { hrefLang: "ko" } : {})}>{practitioner.wordsLink}</a></p>
    {draftNote}
    <details className="about-fold">
      <summary>{t("about.faqSummary")}</summary>
      <dl className="about-list">
        {QUESTIONS.map((id, index) => <div key={id} style={{ "--rise-order": index } as CSSProperties}>
          <dt>{t(`about.faq.${id}.q`)}</dt>
          <dd>{t(`about.faq.${id}.a`)}{id === "storage" && t.locale === "ko" && <> <a href={`${TERMS_PATH}#article-6`}>{koOnly.termsStorageLink}</a></>}</dd>
        </div>)}
      </dl>
    </details>
    <p className="about-stage">{t("about.stage")}</p>
    <p className="about-not">{renderRich(t("about.not"))}</p>
  </section>;
}

/** A web helpline opens in a new tab; a tel: or sms: link is left to the device. */
const external = (href: string) => href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {};

function CrisisCard() {
  const t = useT();
  return (
    <aside className="crisis-card" aria-label={t("crisis.title")}>
      <p className="crisis-emergency">{renderRich(t("crisis.emergency"))}</p>
      {/* English only: the card lists Korean numbers, and an English reader may be elsewhere */}
      {t.locale === "en" && <p className="crisis-emergency crisis-abroad">{enOnly.outsideKorea}</p>}
      <p className="crisis-lead">{t("crisis.intro")}</p>
      <div className="crisis-links">
        <a href={t("crisis.href109")} className="crisis-link" {...external(t("crisis.href109"))}>
          <span>{t("crisis.lifeline109")}</span>
          <strong>{t("crisis.num109")}</strong>
        </a>
        <a href={t("crisis.href1577")} className="crisis-link" {...external(t("crisis.href1577"))}>
          <span>{t("crisis.mental1577")}</span>
          <strong>{t("crisis.num1577")}</strong>
        </a>
        <a href={t("crisis.href1388")} className="crisis-link" {...external(t("crisis.href1388"))}>
          <span>{t("crisis.youth1388")}</span>
          <strong>{t("crisis.num1388")}</strong>
        </a>
      </div>
    </aside>
  );
}

/**
 * Right under the crisis card on the landing only (2026-11-10): the next step for
 * someone who is not in crisis. Plain text with no links and no region to pick,
 * so nothing is stored or sent. The help dialog keeps the crisis card alone.
 */
function NextStep() {
  const t = useT();
  // a number or date is never split across lines (1577-0199 and 2026-11-10 broke at 390px)
  const keepNumbers = (text: string) => text.split(/(\d+(?:-\d+)+)/).map((piece, index) => index % 2 ? <span key={index} className="nowrap">{piece}</span> : piece);
  return <section className="next-step" aria-labelledby="next-step-title">
    <h2 id="next-step-title">{t("nextStep.title")}</h2>
    <p>{keepNumbers(t("nextStep.center"))}</p>
    <p>{keepNumbers(t("nextStep.voucher"))}</p>
    <p>{keepNumbers(t("nextStep.person"))}</p>
    <p className="next-step-checked">{keepNumbers(t("nextStep.checked"))}</p>
  </section>;
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

/**
 * 아직 모르겠다 carries the same weight as 다음 (owner's decision 2026-10-30): an
 * outlined button of the same size, and a record ended here is a finished one.
 */
function QuickAffectScreen({ onNext, onUnknown }: { onNext: (affect: AffectPoint) => void; onUnknown: () => void }) {
  const t = useT();
  const [point, setPoint] = useState<{ valence: number; activation: number } | null>(null);
  return <Screen>
    <StepHeading step={t("quickAffect.step")} title={t("quickAffect.title")} hint={t("quickAffect.hint")} basis={t("quickAffect.basis")} />
    <AffectPad onChange={setPoint} />
    <div className="quick-actions even-actions">
      <button className="secondary-button" onClick={onUnknown}>{t("quickAffect.unknown")}</button>
      <button className="primary-button" disabled={!point} onClick={() => point && onNext(point)}>{t("common.next")} <span>→</span></button>
    </div>
  </Screen>;
}

/**
 * Words are thought of before they are seen (owner's decision 2026-10-30). Until
 * 단어 보기 is pressed (`revealed`), no offered word is drawn: only the person's
 * own-words field and the button. After it, the five nearest words and the
 * similar ones behind 비슷한 표현 더 보기, as before.
 *
 * 이렇게도 말해요 (owner's decision 2026-11-01): under the chips, one line for
 * each picked list word that has dictionary expressions, in the order picked,
 * then the source once. Plain text, nothing to press: the expressions are
 * examples of how people say it, never a choice, and nothing of them is stored.
 * The person's own words get none.
 */
function TieredWords({ pool, selectedLabels, ownWords, onToggle, onAddCustom, meanings, onMeaning, revealed, onReveal }: { pool: EmotionSelection[]; selectedLabels: string[]; ownWords: string[]; onToggle: (label: string) => void; onAddCustom: (label: string) => void; meanings?: Record<string, string>; onMeaning?: (label: string, meaning: string) => void; revealed: boolean; onReveal: () => void }) {
  const t = useT();
  const { emotions } = useContent();
  const [tier, setTier] = useState<1 | 2>(1);
  const [custom, setCustom] = useState("");
  const poolLabels = pool.map((item) => item.label);
  const selectedAsItems = selectedLabels.map((label) => ({ label, source: "suggested" as const }));
  const expanded = expandCandidates([...pool, ...selectedAsItems], undefined, t.locale).filter((item) => !poolLabels.includes(item.label));
  const chip = (label: string) => <button className={`chip ${selectedLabels.includes(label) ? "selected" : ""}`} aria-pressed={selectedLabels.includes(label)} key={label} onClick={() => onToggle(label)}><Mark on={selectedLabels.includes(label)} />{label}</button>;
  const addCustom = () => { onAddCustom(custom); setCustom(""); };

  const mine = ownWords.length > 0 && <>
    <p className="tier-label">{t("words.mine")}</p>
    <div className="chip-grid">{ownWords.map((label) => chip(label))}</div>
    {onMeaning && ownWords.map((label) => <div className="own-meaning" key={label}>
      <label className="field-label" htmlFor={`meaning-${label}`}>{t("words.meaningLabel", { label })} <em>{t("words.optional")}</em></label>
      <input id={`meaning-${label}`} className="text-input" maxLength={INPUT_LIMITS.line} defaultValue={meanings?.[label] ?? ""} onChange={(event) => onMeaning(label, event.target.value)} placeholder={t("words.meaningPlaceholder")} />
    </div>)}
  </>;
  const ownRow = <div className="own-word-row">
    <input className="text-input" maxLength={INPUT_LIMITS.word} value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustom(); }} placeholder={t("common.ownWordsPlaceholder")} aria-label={t("common.ownWordsPlaceholder")} />
    <button className="small-button" disabled={!custom.trim()} onClick={addCustom}>{t("words.add")}</button>
  </div>;

  if (!revealed) return <>
    <div className="own-word-block own-word-first">{ownRow}</div>
    {mine}
    <button className="reveal-button" onClick={onReveal}>{t("words.reveal")}</button>
  </>;

  const sayings = selectedLabels.filter((label) => !ownWords.includes(label)).flatMap((label) => {
    const texts = emotions.items.find((item) => item.label === label)?.expressions?.map((expression) => expression.text) ?? [];
    return texts.length > 0 ? [{ label, texts }] : [];
  });

  return <>
    <div className="chip-grid">{pool.map((item) => chip(item.label))}</div>

    {tier >= 2 && expanded.length > 0 && <>
      <p className="tier-label">{t("words.similar")}</p>
      <div className="chip-grid">{expanded.map((item) => chip(item.label))}</div>
    </>}

    {sayings.length > 0 && <div className="also-said">
      {sayings.map(({ label, texts }) => <p className="small-note" key={label}>{label} · {t("words.alsoSaidAs")}: {texts.join(", ")}</p>)}
      <p className="tier-label">{t("words.expressionSource")}</p>
    </div>}

    {tier === 1 && expanded.length > 0 && <button className="reveal-button" onClick={() => setTier(2)}>{t("words.more")}</button>}

    {mine}

    <div className="own-word-block">
      <p className="tier-label">{t("words.notListed")}</p>
      {ownRow}
      <p className="small-note">{t("words.startingPoint")}</p>
    </div>
  </>;
}

function QuickCandidatesScreen({ pool, selected, response, revealed, onReveal, onToggle, onRespond, onAddCustom, onMeaning, eventText, onEventText, onFinish, onCoach, onDeep }: { pool: EmotionSelection[]; selected: EmotionSelection[]; response?: QuickNonSelection; revealed: boolean; onReveal: () => void; onToggle: (label: string) => void; onRespond: (response: QuickNonSelection) => void; onAddCustom: (label: string) => void; onMeaning: (label: string, meaning: string) => void; eventText: string; onEventText: (eventText: string) => void; onFinish: () => void; onCoach: () => void; onDeep: () => void }) {
  const t = useT();
  const canCoach = getCoachSets(t.locale).some((set) => selected.some((item) => set.words.includes(item.label)));
  return <Screen>
    <StepHeading step={t("quickCandidates.step")} title={revealed ? t("quickCandidates.title") : t("words.beforeTitle")} hint={revealed ? t("quickCandidates.hint") : t("words.beforeHint")} basis={t("quickCandidates.basis")} />
    {revealed && <div className="provisional-note">{t("common.provisionalNote")}</div>}
    <TieredWords revealed={revealed} onReveal={onReveal} pool={pool} selectedLabels={selected.map((item) => item.label)} ownWords={selected.filter((item) => item.source === "custom").map((item) => item.label)} onToggle={onToggle} onAddCustom={onAddCustom} meanings={Object.fromEntries(selected.filter((item) => item.personalMeaning).map((item) => [item.label, item.personalMeaning!]))} onMeaning={onMeaning} />

    <div className="quick-option-row">{(["none-close", "unsure"] as const).map((value) => <button className={`secondary-button ${response === value ? "selected" : ""}`} aria-pressed={response === value} key={value} onClick={() => onRespond(value)}><Mark on={response === value} />{t(`quickCandidates.decline.${value}`)}</button>)}</div>
    {response && <p className="small-note">{t(`quickCandidates.declined.${response}`)}</p>}

    {/* what happened, one optional line (owner's decision 2026-10-30): no source choice and no split into parts, so the quick look stays short */}
    <div className="quick-context">
      <label className="field-label" htmlFor="quick-event">{t("quickCandidates.context.label")} <em>{t("words.optional")}</em></label>
      <input id="quick-event" className="text-input" maxLength={INPUT_LIMITS.text} defaultValue={eventText} onChange={(event) => onEventText(event.target.value)} />
      <p className="small-note">{t("quickCandidates.context.hint")}</p>
    </div>

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
    <input id="coach-own-appraisal" className="text-input" maxLength={INPUT_LIMITS.word} value={own} onChange={(event) => { setOwn(event.target.value); onOwn(event.target.value); }} placeholder={t("coach.ownAppraisalPlaceholder")} />
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
    <input id="coach-own" className="text-input" maxLength={INPUT_LIMITS.word} value={own} onChange={(event) => { setOwn(event.target.value); onOwnWord(event.target.value); }} placeholder={t("coach.ownWordPlaceholder")} />
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
  const affect = quickAffectValue(t, quick?.affect);
  const words = (quick?.selected ?? []).map((item) => item.label).join(" · ") || quickResponseLabel(t, quick?.candidateResponse) || t("common.notChosen");
  // ended at 아직 모르겠다, the words were never asked for, so no row says none were chosen
  const rows: [string, string][] = quick?.affect?.unknown ? [[t("quickSummary.affect"), affect]] : [[t("quickSummary.affect"), affect], [t("quickSummary.words"), words]];
  if (quick?.granularityResponse === "unsure") rows.push([t("quickSummary.granularity"), t("common.unsure")]);
  if (quick?.contrastAnswer) rows.push([t("quickSummary.contrast"), quick.contrastAnswer]);
  const play = useFirstReveal(`${session.id}:quick-summary`);
  const d = revealDelays(rows.length);
  return <Screen className={`reveal-screen${play ? " reveal" : ""}`}>
    <p className="eyebrow reveal-step" style={delay(0)}>{t("quickSummary.eyebrow")}</p>
    <h1 className="reveal-title reveal-step" style={delay(d.title)}>{t("quickSummary.title")}</h1>
    <MiniPad quick={quick?.affect} />
    <div className="summary-card reveal-step" style={delay(d.card)}>{rows.map(([label, value], index) => <SummaryRow key={label} label={label} value={value} style={delay(d.rows[index])} />)}</div>
    <p className="summary-footnote reveal-step" style={delay(d.rest)}>{t("quickSummary.footnote")}</p>
    <div className="reveal-rest reveal-step" style={delay(d.rest)}>
      <SynthesisSection session={session} onFeedback={onFeedback} />
      <div className="stack-actions"><button className="primary-button centered" onClick={onDeep}>{t("quickSummary.deep")} <span>→</span></button><button className="secondary-button" onClick={onSupport}>{t("quickSummary.support")}</button><a className="secondary-button centered" href="/">{t("common.backToStart")}</a></div>
    </div>
    <ResultHelpLine />
  </Screen>;
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
  const chip = (label: string) => <button className={`chip ${selected.includes(label) ? "selected" : ""}`} aria-pressed={selected.includes(label)} key={label} onClick={() => toggle(label)}><Mark on={selected.includes(label)} />{label}</button>;
  const items = bodySignals.items as { label: string; region: string; firstTier?: boolean }[];
  const first = items.filter((item) => item.firstTier);
  const rest = bodySignals.regions
    .map((region) => ({ region, labels: items.filter((item) => item.region === region && !item.firstTier).map((item) => item.label) }))
    .filter((group) => group.labels.length);

  return <Screen>
    <StepHeading step={t("body.step")} title={t("body.title")} pause={t("body.pause")} hint={t("body.hint")} basis={t("body.basis")} />
    <div className="chip-grid">{first.map((item) => chip(item.label))}</div>
    {!showAll && <button className="reveal-button" onClick={() => setShowAll(true)}>{t("body.more")}</button>}
    {showAll && rest.map((group) => <div key={group.region}>
      <p className="tier-label">{group.region}</p>
      <div className="chip-grid">{group.labels.map((label) => chip(label))}</div>
    </div>)}
    <label className="field-label" htmlFor="body-custom">{t("body.customLabel")}</label>
    <input id="body-custom" className="text-input" maxLength={INPUT_LIMITS.word} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder={t("body.customPlaceholder")} />
    <Navigation
      note={stepNote(stepNotes, "body", selected.length > 0 || custom.trim().length > 0)}
      onNext={() => onNext([...selected.filter((label) => label !== custom).map((label) => ({ label })), ...(custom.trim() ? [{ label: custom.trim(), custom: true }] : [])])}
    />
  </Screen>;
}

function AffectScreen({ initial, fromQuick, onNext }: { initial?: AffectPoint; fromQuick: boolean; onNext: (affect: AffectPoint) => void }) {
  const t = useT();
  const { stepNotes } = useContent();
  const [point, setPoint] = useState<{ valence: number; activation: number } | null>(
    initial && !initial.unknown && initial.valence !== undefined && initial.activation !== undefined
      ? { valence: initial.valence, activation: initial.activation }
      : null,
  );
  const [touched, setTouched] = useState(false);
  return <Screen>
    <StepHeading step={t("affect.step")} title={t("affect.title")} hint={fromQuick ? t("affect.hint") : t("affect.hintFresh")} basis={t("affect.basis")} />
    <AffectPad initial={initial} onChange={(next) => { setTouched(true); setPoint(next); }} />
    {/* skipping records nothing, even when the quick look's spot was placed here */}
    <Navigation note={stepNote(stepNotes, "affect", touched)} onSkip={() => onNext({})} onNext={() => onNext(point ?? initial ?? {})} />
  </Screen>;
}

function ContextScreen({ initial, onNext }: { initial?: DeepContext; onNext: (context: DeepContext) => void }) {
  const t = useT();
  const { stepNotes } = useContent();
  const [text, setText] = useState(initial?.eventText ?? "");
  const [source, setSource] = useState<DeepContext["source"]>(initial?.source ?? "event");
  return <Screen><StepHeading step={t("context.step")} title={t("context.title")} hint={t("context.hint")} basis={t("context.basis")} /><textarea className="text-area" maxLength={INPUT_LIMITS.text} value={text} onChange={(event) => setText(event.target.value)} placeholder={t("context.placeholder")} /><p className="small-note">{t("context.privacyHint")}</p><div className="segmented"><span>{t("context.sourceQuestion")}</span>{(["event", "memory", "anticipation", "thought"] as const).map((value) => <button className={source === value ? "selected" : ""} aria-pressed={source === value} key={value} onClick={() => setSource(value)}><Mark on={source === value} />{t(`contextSource.${value}`)}</button>)}</div><Navigation note={stepNote(stepNotes, "context", text.trim().length > 0)} onNext={() => onNext({ eventText: text, source })} /></Screen>;
}

function MeaningScreen({ initial, onNext }: { initial: string[]; onNext: (selected: string[]) => void }) {
  const t = useT();
  const { concerns, stepNotes } = useContent();
  const [selected, setSelected] = useState(initial);
  const [custom, setCustom] = useState("");
  const toggle = (item: string) => setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  return <Screen><StepHeading step={t("meaning.step")} title={t("meaning.title")} hint={t("meaning.hint")} basis={t("meaning.basis")} /><div className="choice-list compact">{concerns.map((item) => <button className={selected.includes(item) ? "selected" : ""} aria-pressed={selected.includes(item)} key={item} onClick={() => toggle(item)}><Mark on={selected.includes(item)} />{item}</button>)}</div><input className="text-input" maxLength={INPUT_LIMITS.word} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder={t("common.ownWordsPlaceholder")} /><Navigation note={stepNote(stepNotes, "meaning", selected.length > 0 || custom.trim().length > 0)} onNext={() => onNext([...selected, ...(custom ? [custom] : [])])} /></Screen>;
}

function EmotionScreen({ initial, affect, revealed, onReveal, onNext }: { initial: EmotionSelection[]; affect?: AffectPoint; revealed: boolean; onReveal: () => void; onNext: (selected: EmotionSelection[]) => void }) {
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
    <StepHeading step={t("emotion.step")} title={revealed ? t("emotion.title") : t("words.beforeTitle")} hint={revealed ? t("emotion.hint") : t("words.beforeHint")} basis={t("emotion.basis")} />
    {revealed && <div className="provisional-note">{t("common.provisionalNote")}</div>}
    <TieredWords revealed={revealed} onReveal={onReveal} pool={pool} selectedLabels={selected} ownWords={ownWords} onToggle={toggle} onAddCustom={addOwnWord} />
    <div className="quick-option-row">{[t("emotion.escapes.several"), t("emotion.escapes.unsure")].map((label) => <button className={`secondary-button ${selected.includes(label) ? "selected" : ""}`} aria-pressed={selected.includes(label)} key={label} onClick={() => toggle(label)}><Mark on={selected.includes(label)} />{label}</button>)}</div>
    <Navigation note={stepNote(stepNotes, "emotion", selected.length > 0)} onNext={() => onNext(selected.map((label) => ({ label, source: ownWords.includes(label) ? "custom" as const : "suggested" as const })))} />
  </Screen>;
}

function OutcomeScreen({ onNext }: { onNext: (outcome: DeepOutcome) => void }) {
  const t = useT();
  const [clarity, setClarity] = useState<DeepOutcome["clarity"]>();
  const [usefulness, setUsefulness] = useState<DeepOutcome["usefulness"]>();
  const [note, setNote] = useState("");
  return <Screen><StepHeading step={t("outcome.step")} title={t("outcome.title")} hint={t("outcome.hint")} basis={t("outcome.basis")} /><div className="choice-list compact">{(["much_clearer", "clearer", "same", "more_complex", "more_distressed"] as const).map((value) => <button className={clarity === value ? "selected" : ""} aria-pressed={clarity === value} key={value} onClick={() => setClarity(value)}><Mark on={clarity === value} />{t(`outcome.clarity.${value}`)}</button>)}</div><h2 className="subquestion">{t("outcome.usefulnessQuestion")}</h2><div className="inline-choices">{(["helpful", "unsure", "unhelpful"] as const).map((value) => <button className={usefulness === value ? "selected" : ""} aria-pressed={usefulness === value} key={value} onClick={() => setUsefulness(value)}><Mark on={usefulness === value} />{t(`outcome.usefulness.${value}`)}</button>)}</div><input className="text-input" maxLength={INPUT_LIMITS.line} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("outcome.notePlaceholder")} /><Navigation disabled={!clarity || !usefulness} onNext={() => onNext({ clarity: clarity!, usefulness: usefulness!, note })} /></Screen>;
}

function SummaryScreen({ session, onFeedback, onTalk, onUnderlying, onUnderlyingNote, onSupport }: { session: EmotionSession; onFeedback: (feedback: { fit?: SynthesisFit; correction?: string }) => void; onTalk: (answer: TalkToSomeone) => void; onUnderlying: (answer: UnderlyingFeeling) => void; onUnderlyingNote: (note: string) => void; onSupport: () => void }) {
  const t = useT();
  const deep = session.deepReflection;
  const play = useFirstReveal(`${session.id}:summary`);
  if (deep?.outcome?.clarity === "more_distressed") return <WorsenedScreen />;
  const quickAffect = session.quickCheck?.affect;
  const rows: [string, string?][] = [];
  if (quickAffect) rows.push([t("summary.quickAffect"), quickAffectValue(t, quickAffect)]);
  // a skipped step stays in the list, quietly, as 비워 둠; 잘 모르겠음 is an answer and keeps its own row text
  rows.push(
    [t("summary.body"), (deep?.body ?? []).map((item) => item.label).join(" · ") || undefined],
    [t("summary.affect"), deepAffectValue(t, deep?.affect)],
    [t("summary.context"), deep?.context?.eventText || undefined],
    [t("summary.concerns"), (deep?.concerns ?? []).join(" · ") || undefined],
    [t("summary.words"), (deep?.emotionCandidates ?? []).map((item) => item.label).join(" · ") || undefined],
  );
  const d = revealDelays(rows.length);
  return <Screen className={`reveal-screen${play ? " reveal" : ""}`}>
    <p className="eyebrow reveal-step" style={delay(0)}>{t("summary.eyebrow")}</p>
    <h1 className="reveal-title reveal-step" style={delay(d.title)}>{t("summary.title")}</h1>
    {/* both spots on one pad, each labelled, never joined (2026-11-05) */}
    <MiniPad quick={quickAffect} deep={deep?.affect} />
    <div className="summary-card reveal-step" style={delay(d.card)}>{rows.map(([label, value], index) => <SummaryRow key={label} label={label} value={value ?? t("common.leftEmpty")} empty={value === undefined} style={delay(d.rows[index])} />)}</div>
    <p className="summary-footnote reveal-step" style={delay(d.rest)}>{t("summary.footnote")}</p>
    <div className="reveal-rest reveal-step" style={delay(d.rest)}>
      <SynthesisSection session={session} onFeedback={onFeedback} />
      <TalkToSomeoneQuestion answer={session.talkToSomeone?.answer} onAnswer={onTalk} />
      <UnderlyingFeelingQuestion answer={session.underlyingFeeling?.answer} note={session.underlyingFeeling?.note ?? ""} onAnswer={onUnderlying} onNote={onUnderlyingNote} />
      <div className="stack-actions"><button className="primary-button centered" onClick={onSupport}>{t("summary.support")} <span>→</span></button><a className="secondary-button centered" href="/">{t("common.backToStart")}</a></div>
    </div>
    <ResultHelpLine />
  </Screen>;
}

/**
 * One question at the end of the slower look: whether the person thinks of
 * telling a person about this. Answering is optional, any answer can be
 * changed, and none of them changes the next screen (session-types
 * `talkToSomeone`). The app does not ask who, and does not follow up.
 */
const TALK_ANSWERS: TalkToSomeone[] = ["yes", "no", "not-yet"];
function TalkToSomeoneQuestion({ answer, onAnswer }: { answer?: TalkToSomeone; onAnswer: (answer: TalkToSomeone) => void }) {
  const t = useT();
  return <section className="talk-question" aria-labelledby="talk-question-title">
    <h2 className="subquestion" id="talk-question-title">{t("talkToSomeone.question")}</h2>
    <p className="small-note">{t("talkToSomeone.hint")}</p>
    <div className="inline-choices">{TALK_ANSWERS.map((value) => <button key={value} className={answer === value ? "selected" : ""} aria-pressed={answer === value} onClick={() => onAnswer(value)}><Mark on={answer === value} />{t(`talkToSomeone.answers.${value}`)}</button>)}</div>
    {answer && <p className="small-note" role="status">{t("talkToSomeone.saved")}</p>}
  </section>;
}

/**
 * A second question in the same form (owner's decision 2026-10-30, second round D):
 * whether another feeling was there first, under this one. Kept and shown back
 * only. No answer changes the next screen, and no word is offered. 있었다 opens one
 * optional line for what it was, which stays with this answer, not the names layer.
 */
const UNDERLYING_ANSWERS: UnderlyingFeeling[] = ["yes", "no", "unsure"];
function UnderlyingFeelingQuestion({ answer, note, onAnswer, onNote }: { answer?: UnderlyingFeeling; note: string; onAnswer: (answer: UnderlyingFeeling) => void; onNote: (note: string) => void }) {
  const t = useT();
  return <section className="talk-question" aria-labelledby="underlying-question-title">
    <h2 className="subquestion" id="underlying-question-title">{t("underlyingFeeling.question")}</h2>
    <p className="small-note">{t("underlyingFeeling.hint")}</p>
    <div className="inline-choices">{UNDERLYING_ANSWERS.map((value) => <button key={value} className={answer === value ? "selected" : ""} aria-pressed={answer === value} onClick={() => onAnswer(value)}><Mark on={answer === value} />{t(`underlyingFeeling.answers.${value}`)}</button>)}</div>
    {answer === "yes" && <div className="own-word-block">
      <label className="field-label" htmlFor="underlying-note">{t("underlyingFeeling.noteLabel")} <em>{t("words.optional")}</em></label>
      <input id="underlying-note" className="text-input" maxLength={INPUT_LIMITS.line} defaultValue={note} onChange={(event) => onNote(event.target.value)} />
    </div>}
    {answer && <p className="small-note" role="status">{t("underlyingFeeling.saved")}</p>}
  </section>;
}

/**
 * The closing screens put together what the person chose, one piece after
 * another, the first time they are shown for a record (docs/BENCHMARK_TALKV_2026_10_19.md).
 * The motion points at what the person did, never at the app working: there
 * is no waiting, no progress figure, and every button works at once. A back
 * step or a re-render shows the screen as it is. With reduced motion turned on
 * in the system, nothing moves. Screen readers get the whole screen at once,
 * title first: only the visual order differs from the document order.
 */
const revealedScreens = new Set<string>();
function useFirstReveal(key: string) {
  // reading in the initialiser and recording in the effect keeps the render pure (Strict Mode calls the initialiser twice)
  const [play] = useState(() => !revealedScreens.has(key));
  useEffect(() => { revealedScreens.add(key); }, [key]);
  return play;
}
/** Seconds: the title first, then the rows rise one by one; the rest arrives with the footnote, about 1.2 s in all. */
const revealDelays = (count: number) => {
  const step = count > 1 ? Math.min(0.18, 0.6 / (count - 1)) : 0;
  const rows = Array.from({ length: count }, (_, index) => 0.45 + index * step);
  const last = rows[rows.length - 1] ?? 0.45;
  // the title opens the screen (owner's choice 2026-10-19); the pieces then fall into place under it
  return { card: 0.35, rows, title: 0.05, rest: last + 0.3 };
};
const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

/**
 * The spots the person marked, drawn small on the same pad, with its axis names
 * (2026-11-05). Read-only: no number, nothing to press. With both a quick and a
 * slower spot, each carries a small label and the later one is the darker; they
 * are never joined by a line. Nothing when no spot was marked (skipped, or left
 * as unsure). The rows beside it say the same in words, so it is hidden from
 * screen readers.
 */
function MiniPad({ quick, deep }: { quick?: AffectPoint; deep?: AffectPoint }) {
  const t = useT();
  const spots = ([[quick, "quick"], [deep, "deep"]] as const).filter(([affect]) => hasAffectPoint(affect));
  if (!spots.length) return null;
  const labelled = spots.length > 1;
  return <div className="mini-pad-wrap reveal-step" style={delay(0)} aria-hidden="true">
    <div className="mini-axis top">{t("affectPad.top")}</div>
    <div className="mini-pad">
      {spots.map(([affect, kind]) => {
        const at = { left: `${affect!.valence! * 100}%`, top: `${(1 - affect!.activation!) * 100}%` };
        return <span key={kind} className={`mini-spot mini-${kind}`}>
          <span className="mini-ring" style={at} />
          <span className="mini-dot" style={at} />
          {labelled && <span className={`mini-label${affect!.valence! > 0.6 ? " to-left" : ""}`} style={at}>{t(kind === "quick" ? "recordDetail.quickAffect" : "recordDetail.deepAffect")}</span>}
        </span>;
      })}
    </div>
    <div className="mini-axis-row"><span>{t("affectPad.left")}</span><span>{t("affectPad.right")}</span></div>
    <div className="mini-axis bottom">{t("affectPad.bottom")}</div>
  </div>;
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
    <div className="inline-choices">{(["close", "partly", "unsure"] as const).map((value) => <button className={fit === value ? "selected" : ""} aria-pressed={fit === value} key={value} onClick={() => onFeedback({ fit: value })}><Mark on={fit === value} />{t(`synthesisSection.fit.${value}`)}</button>)}</div>

    {editing
      ? <div className="own-word-block">
          <textarea className="text-area" maxLength={INPUT_LIMITS.text} value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder={t("synthesisSection.correctionPlaceholder")} aria-label={t("synthesisSection.correct")} />
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
      <div className="choice-list compact">{list.filter((item) => item.group === group).map((item) => <button className={need?.id === item.id ? "selected" : ""} aria-pressed={need?.id === item.id} key={item.id} onClick={() => onNeed(item.id)}><Mark on={need?.id === item.id} />{item.label}</button>)}</div>
    </div>)}

    {need?.responses && <div className="response-block">
      <p className="tier-label">{need.label}</p>
      {need.because && <p className="step-note">{need.because}</p>}
      <div className="choice-list">{need.responses.map((option) => <button className={picked.includes(option.id) ? "selected" : ""} aria-pressed={picked.includes(option.id)} key={option.id} onClick={() => onResponse(option.id)}><Mark on={picked.includes(option.id)} />{option.label}</button>)}</div>
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
function RecordsScreen({ records, manageOpen = false, onHelp, onOpen, onBack, onChanged }: { records: EmotionSession[]; manageOpen?: boolean; onHelp: () => void; onOpen: (session: EmotionSession) => void; onBack: () => void; onChanged: () => void }) {
  const t = useT();
  return <Screen className="entry-screen">
    <p className="eyebrow">{t("records.eyebrow")}</p>
    <h1>{t("records.title")}</h1>
    {records.length > 0 && <DayStrip records={records} />}
    <RecordsMap records={records} onOpen={onOpen} />
    {records.length === 0
      ? <p className="lede">{t("records.empty")}</p>
      : <div className="record-list">{records.map((session) => {
          const item = summarise(session, t.locale);
          // the card and its 도움 are two buttons side by side, so pressing 도움 never opens the record (2026-11-10)
          return <div className="record-card" key={item.id}><button className="record-row" id={`record-${item.id}`} onClick={() => onOpen(session)}>
            <span className="record-when">{formatWhen(item.at, t.locale)}<em>{item.depthLabel}</em></span>
            {(() => {
              // the moment's own words, else names given later, else the answer given then; a record with none is not lacking
              const name = item.words.join(" · ") || (session.labelsLater ?? []).map((entry) => entry.label).join(" · ")
                || (session.quickCheck?.affect?.unknown && !session.deepReflection ? t("quickAffect.unknown") : session.deepReflection?.emotionCandidates?.length ? "" : quickResponseLabel(t, session.quickCheck?.candidateResponse));
              return name ? <strong>{name}</strong> : <strong className="names-not-yet">{t("records.namesNotYet")}</strong>;
            })()}
            {item.needLabel && <span className="record-need">{t("records.needLine", { label: item.needLabel })}</span>}
            {item.responseLabels.length > 0 && <span className="record-need">{t("records.responsesLine", { labels: item.responseLabels.join(" / ") })}</span>}
          </button><RecordHelp onHelp={onHelp} /></div>;
        })}</div>}
    <HelpLine onHelp={onHelp} />
    {/* moving and deleting, folded into one line (2026-11-05); open when the person came to manage them */}
    <details className="record-manage" open={manageOpen}>
      <summary>{t("records.manage")}</summary>
      <RecordTransfer count={records.length} onChanged={onChanged} />
    </details>
    <div className="navigation"><button className="quiet-button" onClick={onBack}>{t("records.backToStart")}</button><span /></div>
  </Screen>;
}

/**
 * The last fourteen days above the list (owner's decision 2026-10-30, second round C):
 * a dot on a day with a record, an open dashed space on a day without, today at the
 * right end. It only shows; a dot takes you to that day's first record in the list.
 * No count, no run of days, and an open day is not coloured as missed.
 */
function DayStrip({ records }: { records: EmotionSession[] }) {
  const t = useT();
  const days = recentDays(records);
  const jump = (id: string) => {
    const row = document.getElementById(`record-${id}`);
    row?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    row?.focus();
  };
  return <section className="day-strip" aria-labelledby="day-strip-title">
    <p className="tier-label" id="day-strip-title">{t("records.days.title")}</p>
    <ol className="day-cells">{days.map((day) => <li key={day.key}>
      {day.firstId
        ? <button className="day-cell has-record" aria-label={t("records.days.goTo", { date: formatDay(day.iso, t.locale) })} onClick={() => jump(day.firstId!)}><span className="day-dot" aria-hidden="true" /></button>
        : <span className="day-cell is-open" aria-hidden="true" />}
    </li>)}</ol>
    <div className="day-ends" aria-hidden="true"><span>{formatDay(days[0].iso, t.locale)}</span><span>{t("records.days.today")}</span></div>
  </section>;
}

/**
 * 내 지도, under the 14-day strip (2026-11-05): every record with a spot, on one
 * pad, joined in time order by a thin line. Older points are fainter, newer ones
 * darker, and the latest a little larger. Where two records are more than 14
 * days apart the line between them is dotted; nothing else marks the rest.
 * Each point opens its record, by pointer or keyboard, in time order. No count,
 * no next point, no reading of the shape. Not drawn when no record has a spot.
 */
function RecordsMap({ records, onOpen }: { records: EmotionSession[]; onOpen: (session: EmotionSession) => void }) {
  const t = useT();
  const points = mapPoints(records);
  if (!points.length) return null;
  const last = points.length - 1;
  // oldest .3, newest 1: the fade carries time, never a colour per feeling (§19)
  const strength = (index: number) => last === 0 ? 1 : 0.3 + 0.7 * (index / last);
  const x = (valence: number) => valence * 100;
  const y = (activation: number) => (1 - activation) * 100;
  return <section className="records-map" aria-labelledby="records-map-title">
    <p className="tier-label" id="records-map-title">{t("records.map.title")}</p>
    <div className="map-wrap">
      <div className="mini-axis top" aria-hidden="true">{t("affectPad.top")}</div>
      <div className="map-pad">
        {points.length > 1 && <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {points.slice(1).map((point, index) => <line key={point.id} className={point.afterGap ? "is-gap" : undefined} x1={x(points[index].valence)} y1={y(points[index].activation)} x2={x(point.valence)} y2={y(point.activation)} style={{ opacity: strength(index + 1) }} />)}
        </svg>}
        {points.map((point, index) => {
          const session = records.find((item) => item.id === point.id)!;
          return <button key={point.id} className={`map-point${index === last ? " is-latest" : ""}`} style={{ left: `${x(point.valence)}%`, top: `${y(point.activation)}%` }} aria-label={t("records.map.open", { when: formatWhen(point.at, t.locale) })} onClick={() => onOpen(session)}>
            <span className="map-dot" style={{ opacity: strength(index) }} aria-hidden="true" />
          </button>;
        })}
      </div>
      <div className="mini-axis-row" aria-hidden="true"><span>{t("affectPad.left")}</span><span>{t("affectPad.right")}</span></div>
      <div className="mini-axis bottom" aria-hidden="true">{t("affectPad.bottom")}</div>
    </div>
  </section>;
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
  // locking the export (optional): empty fields export as before
  const [passphrase, setPassphrase] = useState("");
  const [passphraseAgain, setPassphraseAgain] = useState("");
  const [busy, setBusy] = useState(false);
  // a picked file that turned out to be locked, waiting for its passphrase
  const [lockedText, setLockedText] = useState<string | null>(null);
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const unlockInput = useRef<HTMLInputElement>(null);
  const wantsLock = passphrase.length > 0 || passphraseAgain.length > 0;
  const lockProblem = !wantsLock ? null : passphrase.length < MIN_PASSPHRASE_LENGTH ? "tooShort" : passphrase !== passphraseAgain ? "mismatch" : null;

  // the question takes the focus, so it is read before the choice is made
  useEffect(() => {
    if (plan || confirmingDelete) summary.current?.focus();
  }, [plan, confirmingDelete]);
  useEffect(() => {
    if (lockedText) unlockInput.current?.focus();
  }, [lockedText]);

  const refuse = (error: ImportError | "unreadable") => {
    setPlan(null);
    setNote({ kind: "alert", text: t(`recordTransfer.errors.${error}`) });
  };

  const exportAll = async () => {
    const name = exportFileName();
    const file = buildExport(loadCompleted());
    if (!wantsLock) {
      downloadExport(file, name);
      setNote({ kind: "status", text: t("recordTransfer.exported", { name }) });
      return;
    }
    if (lockProblem) return;
    setBusy(true);
    setNote({ kind: "status", text: t("recordTransfer.lock.locking") });
    try {
      const locked = await lockExport(file, passphrase);
      const lockedName = lockedFileName(name);
      downloadJson(JSON.stringify(locked, null, 2), lockedName);
      setPassphrase("");
      setPassphraseAgain("");
      setNote({ kind: "status", text: t("recordTransfer.lock.exported", { name: lockedName }) });
    } catch {
      setNote({ kind: "alert", text: t("recordTransfer.lock.failed") });
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    if (!lockedText || !unlockPassphrase) return;
    setBusy(true);
    setNote({ kind: "status", text: t("recordTransfer.lock.unlocking") });
    const opened = await unlockExport(lockedText, unlockPassphrase);
    setBusy(false);
    if (!opened.ok) {
      setNote({ kind: "alert", text: t(`recordTransfer.lock.errors.${opened.error}`) });
      return;
    }
    setLockedText(null);
    setUnlockPassphrase("");
    const parsed = parseImport(opened.text);
    if (!parsed.ok) return refuse(parsed.error);
    setNote(null);
    setPlan(planImport(parsed, loadCompleted()));
  };

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setConfirmingDelete(false);
    if (file.size > MAX_IMPORT_BYTES) return refuse("too-large");
    readFileText(file).then((text) => {
      if (isLockedText(text)) {
        setPlan(null);
        setNote(null);
        setUnlockPassphrase("");
        setLockedText(text);
        return;
      }
      setLockedText(null);
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
    <p className="small-note">{t("recordTransfer.exportShareNote")}</p>
    <p className="small-note">{count > 0 ? t("recordTransfer.exportScope", { count }) : t("recordTransfer.exportEmpty")}</p>
    {count > 0 && <div className="lock-fields" role="group" aria-labelledby="lock-legend">
      <p className="lock-legend" id="lock-legend">{t("recordTransfer.lock.legend")}</p>
      <p className="small-note">{t("recordTransfer.lock.hint")}</p>
      <label className="lock-label" htmlFor="lock-passphrase">{t("recordTransfer.lock.passphrase")}</label>
      <input id="lock-passphrase" className="text-input" type="password" autoComplete="new-password" maxLength={200} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
      <label className="lock-label" htmlFor="lock-passphrase-again">{t("recordTransfer.lock.confirm")}</label>
      <input id="lock-passphrase-again" className="text-input" type="password" autoComplete="new-password" maxLength={200} value={passphraseAgain} onChange={(event) => setPassphraseAgain(event.target.value)} />
      {wantsLock && <p className="small-note" role={lockProblem ? "alert" : undefined}>{lockProblem === "tooShort" ? t("recordTransfer.lock.tooShort") : lockProblem === "mismatch" ? t("recordTransfer.lock.mismatch") : t("recordTransfer.lock.warning")}</p>}
    </div>}
    <div className="quick-option-row">
      <button className="secondary-button" disabled={count === 0 || busy || Boolean(lockProblem)} onClick={exportAll}>{wantsLock ? t("recordTransfer.lock.exportLocked") : t("recordTransfer.export")}</button>
      <button className="secondary-button" onClick={() => fileInput.current?.click()}>{t("recordTransfer.import")}</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label={t("recordTransfer.importFileLabel")} onChange={pickFile} />
    </div>

    {lockedText && <div role="group" aria-labelledby="record-unlock-question">
      <p className="synthesis-question" id="record-unlock-question">{t("recordTransfer.lock.unlockQuestion")}</p>
      <label className="lock-label" htmlFor="unlock-passphrase">{t("recordTransfer.lock.unlockLabel")}</label>
      <input id="unlock-passphrase" ref={unlockInput} className="text-input" type="password" autoComplete="current-password" maxLength={200} value={unlockPassphrase} onChange={(event) => setUnlockPassphrase(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void unlock(); }} />
      <div className="quick-option-row">
        <button className="secondary-button" disabled={!unlockPassphrase || busy} onClick={() => void unlock()}>{t("recordTransfer.lock.unlock")}</button>
        <button className="quiet-button" onClick={() => { setLockedText(null); setUnlockPassphrase(""); setNote({ kind: "status", text: t("recordTransfer.importCancelled") }); }}>{t("recordTransfer.lock.unlockCancel")}</button>
      </div>
    </div>}

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

/**
 * A past record, line by line, each with the band and label of where it came
 * from (owner's decision 2026-10-30): what the person pressed or wrote, what the
 * app worked out from it, and what was added later. Colour is never the only sign.
 */
function RecordDetail({ session, previous, onHelp, onFollowUp, onAddLabel, onBack }: { session: EmotionSession; previous?: EmotionSession; onHelp: () => void; onFollowUp: (followUp: { tried?: "yes" | "partly" | "no"; helped?: "yes" | "somewhat" | "no" | "unsure" }) => void; onAddLabel: (label: string) => void; onBack: () => void }) {
  const t = useT();
  const item = summarise(session, t.locale);
  const followUp = session.support?.followUp;
  const deep = session.deepReflection;
  const quickAffect = session.quickCheck?.affect;
  const mine = (how: "pressed" | "wrote" | "skipped" | WordHow): RowSource => ({ kind: "mine", label: t(`recordDetail.source.${how}`) });
  const app = (what: "sentence" | "depth"): RowSource => ({ kind: "app", label: t(`recordDetail.source.${what}`) });
  const lines = wordLines(session);
  const quickResponse = deep?.emotionCandidates?.length ? "" : quickResponseLabel(t, session.quickCheck?.candidateResponse);
  const endedUnsure = Boolean(quickAffect?.unknown && !deep);
  // the record just before, in the same four places only (2026-11-05): shown under the line, never compared
  const before = previous ? previousLines(previous) : undefined;
  const lastTime = (value?: string) => before && value ? <p className="previous-line">{t("recordDetail.previous", { date: formatDay(before.at, t.locale), value })}</p> : null;
  const concernRows = concernLines(session);
  // where each line came from, and how far the record went, wait behind one button (2026-11-05); the bands stay
  const [sourcesShown, setSourcesShown] = useState(false);
  return <SourcesShown.Provider value={sourcesShown}><Screen>
    <div className="record-detail-top"><p className="eyebrow">{t("records.eyebrow")}</p><RecordHelp onHelp={onHelp} /></div>
    <h1>{formatWhen(item.at, t.locale)}</h1>
    {sourcesShown && <SourceLegend />}
    <MiniPad quick={quickAffect} deep={deep?.affect} />
    <div className="summary-card with-sources">
      {sourcesShown && <SummaryRow label={t("recordDetail.depth")} value={item.depthLabel} source={app("depth")} />}
      {quickAffect && (quickAffect.unknown
        ? <SummaryRow label={t("recordDetail.quickAffect")} value={t("quickAffect.unknown")} source={mine("pressed")} />
        : <SummaryRow label={t("recordDetail.quickAffect")} value={quickAffectValue(t, quickAffect)} source={app("sentence")} />)}
      {session.quickCheck?.context?.eventText && <SummaryRow label={t("recordDetail.quickContext")} value={session.quickCheck.context.eventText} source={mine("wrote")} />}
      {deep?.body && deep.body.length > 0 && <>
        <SummaryRow label={t("recordDetail.body")} value={deep.body.map((entry) => entry.label).join(" · ")} source={mine(deep.body.some((entry) => entry.custom) ? "wrote" : "pressed")} />
        {lastTime(before?.body)}
      </>}
      {deep?.affect && (hasAffectPoint(deep.affect)
        ? <SummaryRow label={t("recordDetail.deepAffect")} value={deepAffectValue(t, deep.affect)!} source={app("sentence")} />
        : <LeftEmptyRow label={t("recordDetail.deepAffect")} value={deepAffectValue(t, deep.affect)} source={mine(deep.affect.unknown ? "pressed" : "skipped")} />)}
      {deep?.context?.eventText && <SummaryRow label={t("recordDetail.context")} value={deep.context.eventText} source={mine("wrote")} />}
      {concernRows.map((line) => <SummaryRow key={line.how} label={t("recordDetail.concerns")} value={line.items.join(" · ")} source={mine(line.how)} />)}
      {concernRows.length > 0 && lastTime(before?.concerns)}
      {item.personalMeanings.map((entry) => <SummaryRow key={entry.label} label={t("recordDetail.personalMeaning", { label: entry.label })} value={entry.meaning} source={mine("wrote")} />)}
      {session.talkToSomeone && <SummaryRow label={t("talkToSomeone.recordLabel")} value={t(`talkToSomeone.answers.${session.talkToSomeone.answer}`)} source={mine("pressed")} />}
      {session.underlyingFeeling && <SummaryRow label={t("underlyingFeeling.recordLabel")} value={t(`underlyingFeeling.answers.${session.underlyingFeeling.answer}`)} source={mine("pressed")} />}
      {session.underlyingFeeling?.answer === "yes" && session.underlyingFeeling.note && <SummaryRow label={t("underlyingFeeling.noteRecordLabel")} value={session.underlyingFeeling.note} source={mine("wrote")} />}
      {item.needLabel && <>
        <SummaryRow label={t("recordDetail.need")} value={item.needLabel} source={mine("pressed")} />
        {lastTime(before?.need)}
      </>}
      {item.responseLabels.length > 0 && <SummaryRow label={t("recordDetail.responses")} value={item.responseLabels.join(" / ")} source={mine("pressed")} />}
    </div>

    <NamesLayer
      day={formatDay(item.at, t.locale)}
      // 가까운 말이 없음 · 잘 모르겠음 · 아직 모르겠다 are answers given then, so they are the first line too
      first={endedUnsure ? [{ key: "unsure", value: t("quickAffect.unknown"), source: mine("pressed") }]
        : lines.length ? lines.map((line) => ({ key: line.how, value: line.words.join(" · "), source: mine(line.how) }))
        : quickResponse ? [{ key: "response", value: quickResponse, source: mine("pressed") }] : []}
      later={session.labelsLater ?? []}
      onAdd={onAddLabel}
      previous={lastTime(before?.names)}
    />

    {item.canFollowUp && <section className="synthesis">
      <p className="tier-label">{t("recordDetail.followUpTitle")}</p>
      <p className="synthesis-question">{t("recordDetail.triedQuestion")}</p>
      <div className="inline-choices">{triedOptions(t.locale).map((option) => <button className={followUp?.tried === option.id ? "selected" : ""} aria-pressed={followUp?.tried === option.id} key={option.id} onClick={() => onFollowUp({ tried: option.id })}><Mark on={followUp?.tried === option.id} />{option.label}</button>)}</div>
      {(followUp?.tried === "yes" || followUp?.tried === "partly") && <>
        <p className="synthesis-question">{t("recordDetail.helpedQuestion")}</p>
        <div className="inline-choices">{helpedOptions(t.locale).map((option) => <button className={followUp?.helped === option.id ? "selected" : ""} aria-pressed={followUp?.helped === option.id} key={option.id} onClick={() => onFollowUp({ helped: option.id })}><Mark on={followUp?.helped === option.id} />{option.label}</button>)}</div>
      </>}
      <p className="synthesis-caveat">{t("recordDetail.followUpCaveat")}</p>
    </section>}

    <button className="inline-link sources-toggle" aria-expanded={sourcesShown} onClick={() => setSourcesShown((shown) => !shown)}>{sourcesShown ? t("recordDetail.sourcesHide") : t("recordDetail.sourcesShow")}</button>
    <div className="navigation"><button className="quiet-button" onClick={onBack}>{t("recordDetail.backToList")}</button><a className="primary-button" href="/">{t("recordDetail.toStart")} <span>→</span></a></div>
    <HelpLine onHelp={onHelp} />
  </Screen></SourcesShown.Provider>;
}

/**
 * The names a record has been given: the words of the moment on the first line,
 * dated, then each name given later, by day (owner's decision 2026-10-30). One
 * can be added, never edited or removed, and nothing is suggested. A record with
 * no name yet shows an open, dashed space, never the word for none.
 */
function NamesLayer({ day, first, later, onAdd, previous }: { day: string; first: { key: string; value: string; source: RowSource }[]; later: { label: string; at: string }[]; onAdd: (label: string) => void; previous?: React.ReactNode }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) field.current?.focus(); }, [adding]);
  const save = () => { if (!label.trim()) return; onAdd(label); setLabel(""); setAdding(false); };
  const empty = first.length === 0 && later.length === 0;
  return <section className="names-layer" aria-labelledby="names-title">
    <p className="tier-label" id="names-title">{t("recordDetail.names.title")}</p>
    {empty
      ? <p className="names-not-yet names-empty">{t("records.namesNotYet")}</p>
      : <div className="summary-card with-sources">
          {first.map((line) => <SummaryRow key={line.key} label={day} value={line.value} source={line.source} />)}
          {later.map((entry, index) => {
            const date = formatDay(entry.at, t.locale);
            return <SummaryRow key={`${entry.at}-${index}`} label={date} value={entry.label} source={{ kind: "later", label: t("recordDetail.addedOn", { date }) }} />;
          })}
          {previous}
        </div>}
    {adding
      ? <div className="own-word-block">
          <label className="field-label" htmlFor="name-later">{t("recordDetail.names.fieldLabel")}</label>
          <div className="own-word-row">
            <input id="name-later" ref={field} className="text-input" maxLength={INPUT_LIMITS.word} value={label} onChange={(event) => setLabel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); }} />
            <button className="small-button" disabled={!label.trim()} onClick={save}>{t("recordDetail.names.save")}</button>
          </div>
          <p className="small-note">{t("recordDetail.names.hint")}</p>
          <div className="quick-option-row"><button className="quiet-button" onClick={() => { setLabel(""); setAdding(false); }}>{t("recordDetail.names.cancel")}</button></div>
        </div>
      : <button className="secondary-button names-add" onClick={() => setAdding(true)}>{t("recordDetail.names.add")}</button>}
  </section>;
}

function StoppedScreen({ session }: { session: EmotionSession }) { const t = useT(); return <Screen className="entry-screen"><p className="eyebrow">{t("stopped.eyebrow")}</p><h1>{renderRich(t("stopped.title"))}</h1><p className="lede">{t("stopped.lede")}</p><div className="stack-actions"><a className="primary-button centered" href="/">{t("stopped.home")}</a><button className="quiet-button" onClick={() => { removeDraft(); dropCompleted(session.id); window.location.reload(); }}>{t("stopped.delete")}</button></div>{session.stopReason === "entry" && <p className="small-note">{t("stopped.entryNote")}</p>}<HelpReveal /></Screen>; }

/**
 * After 더 불편해짐 the summary, its questions and the need screen are left out:
 * nothing more is asked. Ending is the first action; the helplines are one
 * optional tap away. This is not a risk check and judges nothing.
 */
function WorsenedScreen() {
  const t = useT();
  return <Screen className="entry-screen">
    <p className="eyebrow">{t("worsened.eyebrow")}</p>
    <h1>{renderRich(t("worsened.title"))}</h1>
    <p className="lede">{t("worsened.lede")}</p>
    <div className="stack-actions"><a className="primary-button centered" href="/">{t("worsened.finish")}</a></div>
    <p className="small-note">{t("worsened.kept")}</p>
    <HelpReveal />
  </Screen>;
}

/**
 * The same line at the foot of the records list and of a record (2026-11-05): it
 * opens the help card the header's 도움 opens. It is always there and always the
 * same; nothing in a record changes it, and nothing is read for risk (SAFETY.md).
 */
/**
 * The last line of both closing screens (2026-11-12, check H1): 109, 1577-0199
 * and 1388 in one small sentence, each a tel: link drawn from the crisis card's
 * own numbers. Always there and never animated, whatever the entry says;
 * nothing reads the entry for risk (SAFETY.md). The English is a draft.
 */
function ResultHelpLine() {
  const t = useT();
  // the numbers go back in as their own marks, so TermsText draws them as links
  const text = t("common.resultHelp", { num109: "{num109}", num1577: "{num1577}", num1388: "{num1388}" });
  return <>
    <p className="result-help"><TermsText text={text} /></p>
    {t.locale === "en" && <p className="draft-note">{enOnly.draftNote}</p>}
  </>;
}

function HelpLine({ onHelp }: { onHelp: () => void }) {
  const t = useT();
  return <p className="help-line"><button className="inline-link" onClick={onHelp}>{t("common.helpLine")} <span aria-hidden="true">→</span></button></p>;
}

/**
 * The small 도움 on every card of the records list and at the top of a record
 * (2026-11-10). Every card gets the same one in the same place: nothing in a
 * record is read to show, hide or change it (SAFETY.md). It opens the header's card.
 */
function RecordHelp({ onHelp }: { onHelp: () => void }) {
  const t = useT();
  return <button type="button" className="record-help" aria-label={t("common.helpLink")} onClick={onHelp}>{t("common.helpShort")}</button>;
}

/** The helplines, folded until asked for, so they are offered without being pressed on anyone. */
function HelpReveal() {
  const t = useT();
  return <details className="why help-reveal">
    <summary>{t("worsened.showHelp")}</summary>
    <CrisisCard />
  </details>;
}

/**
 * The same crisis card as on the landing, opened from any step. It does not
 * stop or change the session; closing it returns to the step as it was.
 */
function HelpDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-dialog-title">
      <h2 id="help-dialog-title" className="help-modal-title">{t("crisis.title")}</h2>
      <CrisisCard />
      <div className="modal-actions"><button ref={closeButton} className="secondary-button" onClick={onClose}>{t("common.close")}</button></div>
    </div>
  </div>;
}

function StopModal({ onClose, onStop }: { onClose: () => void; onStop: () => void }) { const t = useT(); return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><p className="eyebrow">{t("stopModal.eyebrow")}</p><h2>{renderRich(t("stopModal.title"))}</h2><p>{t("stopModal.body")}</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>{t("stopModal.keepGoing")}</button><button className="primary-button" onClick={onStop}>{t("stopModal.stop")}</button></div></div></div>; }

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`screen ${className}`}>{children}</section>; }
/** The basis band, when given, says which moment the question is about, before the question itself. */
/** `pause`, when given, sits right under the title: that stopping here is fine (the body step, 2026-10-30). */
function StepHeading({ step, title, hint, basis, pause }: { step: string; title: string; hint: string; basis?: string; pause?: string }) { return <><p className="eyebrow">{step}</p>{basis && <p className="step-basis">{basis}</p>}<h1>{title}</h1>{pause && <p className="pause-line">{pause}</p>}<p className="hint">{hint}</p></>; }
function Navigation({ onNext, onSkip = onNext, disabled = false, note }: { onNext: () => void; onSkip?: () => void; disabled?: boolean; note?: string }) {
  const t = useT();
  return <><StepNote note={note} /><div className="navigation"><button className="skip-button" onClick={onSkip}>{t("common.skip")}</button><button className="primary-button" disabled={disabled} onClick={onNext}>{t("common.next")} <span>→</span></button></div></>;
}
function StepNote({ note }: { note?: string }) { return note ? <p className="step-note" role="note">{note}</p> : null; }
/** A row whose value may be a skipped step: shown quietly as 비워 둠. */
function LeftEmptyRow({ label, value, source }: { label: string; value?: string; source?: RowSource }) { const t = useT(); return <SummaryRow label={label} value={value ?? t("common.leftEmpty")} empty={value === undefined} source={source} />; }
/** Where a record line came from: a band at its left edge and a short label under it (record detail only). */
type RowSource = { kind: SourceKind; label: string };
/** Whether the short source labels are shown; the band always is. The record detail folds them (2026-11-05). */
const SourcesShown = createContext(true);
function SummaryRow({ label, value, empty = false, style, source }: { label: string; value: string; empty?: boolean; style?: CSSProperties; source?: RowSource }) {
  const labelShown = useContext(SourcesShown);
  return <div className={`summary-row reveal-step${empty ? " is-empty" : ""}${source ? ` has-source source-${source.kind}` : ""}`} style={style}><span>{label}</span><strong>{value}</strong>{source && labelShown && <em className="source-label">{source.label}</em>}</div>;
}
/** The three bands, named once above the record. */
function SourceLegend() {
  const t = useT();
  return <ul className="source-legend" aria-label={t("recordDetail.legend.title")}>
    {(["mine", "app", "later"] as const).map((kind) => <li key={kind} className={`source-${kind}`}>{t(`recordDetail.legend.${kind}`)}</li>)}
  </ul>;
}
function quickAffectSuggestion(session: EmotionSession): AffectPoint | undefined {
  const affect = session.quickCheck?.affect;
  if (!affect || affect.unknown) return undefined;
  return { valence: affect.valence, activation: affect.activation };
}
/** The quick pad as words; 아직 모르겠다 is the answer given there, said back in the same words. */
function quickAffectValue(t: Translate, affect?: AffectPoint) {
  return affect?.unknown ? t("quickAffect.unknown") : `${quickValence(affect?.valence, t.locale)} · ${quickActivation(affect?.activation, t.locale)}`;
}
/** 잘 모르겠음 stays its own answer; a skipped pad is left empty (undefined), never the middle. */
function deepAffectValue(t: Translate, affect?: AffectPoint) {
  if (affect?.unknown) return t("common.unsure");
  if (!hasAffectPoint(affect)) return undefined;
  return `${scaleLabel(affect!.valence, t.locale)} · ${activationLabel(affect!.activation, t.locale)}`;
}
function quickResponseLabel(t: Translate, response?: QuickNonSelection) { return response ? t(`quickCandidates.decline.${response}`) : ""; }
const stepNote = (stepNotes: LocaleContent["stepNotes"], step: keyof LocaleContent["stepNotes"]["steps"], shown: boolean) => (shown ? stepNotes.steps[step] : undefined);
