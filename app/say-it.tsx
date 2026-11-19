"use client";

/**
 * The area under 「사실 / 내 느낌 / 원하는 것을 나눠 적기」 on the need screen (2026-11-19,
 * owner's pick of mock-up A, "from cards to a speech bubble"): three small cards, filled
 * in from the record and free to change, with a thread from each into one bubble that
 * holds the joined sentence (lib/say-it.ts).
 *
 * Nothing typed here is stored or sent. The lines and the sentence live in this
 * component's state only, so folding the area or leaving the screen clears them. 복사
 * puts the sentence on the device's clipboard and nowhere else.
 *
 * Motion (docs/design.md §7): when a line is changed, a light runs once along its thread
 * (0.65s) and its part of the sentence is tinted for a moment. Nothing moves on its own,
 * and with reduced motion turned on nothing moves at all. The threads are decoration and
 * are hidden from screen readers; the sentence is not a live region, so typing is not read
 * back at every key. Only the result of 복사 is announced.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { INPUT_LIMITS } from "../lib/limits";
import { enOnly } from "../lib/i18n/messages.en";
import { useT } from "../lib/i18n/react";
import { SAY_KEYS, sayClauses, sayFromRecord, type SayKey, type SayParts } from "../lib/say-it";
import type { EmotionSession } from "../lib/session-types";
import styles from "./say-it.module.css";

const TYPING_PAUSE_MS = 450; // the light waits until the typing rests
const LIGHT_MS = 650;
const LIGHT_LENGTH = 18;
const TINT_MS = 450;
const COPIED_MS = 2400;

const reducedMotion = () => typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** For a browser without the clipboard API: select the text in a hidden field and ask for a copy. */
const copyBySelection = (text: string) => {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  let done = false;
  try { done = typeof document.execCommand === "function" && document.execCommand("copy"); } catch { done = false; }
  field.remove();
  return done;
};

const TONE: Record<SayKey, string> = { fact: styles.fact, feel: styles.feel, want: styles.want };

/**
 * `label` names the area for screen readers (the choice that opened it). `play` is true
 * when the person has just opened it, so the three threads light once in turn; an area
 * already open when the screen appears is shown still.
 */
export function SayIt({ session, label, play = false }: { session: EmotionSession; label: string; play?: boolean }) {
  const t = useT();
  const id = useId();
  const [record] = useState(() => sayFromRecord(session));
  const [parts, setParts] = useState<SayParts>(record.parts);
  const [polite, setPolite] = useState(false);
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");
  const [held, setHeld] = useState(false);
  const [tinted, setTinted] = useState<SayKey | null>(null);
  const [threads, setThreads] = useState<{ box: string; paths: Record<SayKey, string> } | null>(null);

  const fold = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const cards = useRef<Record<SayKey, HTMLDivElement | null>>({ fact: null, feel: null, want: null });
  const fields = useRef<Record<SayKey, HTMLTextAreaElement | null>>({ fact: null, feel: null, want: null });
  const lights = useRef<Record<SayKey, SVGPathElement | null>>({ fact: null, feel: null, want: null });
  const timers = useRef<number[]>([]);
  const typing = useRef<Partial<Record<SayKey, number>>>({});
  const copyTimer = useRef<number | undefined>(undefined);

  const english = t.locale === "en";
  const clauses = sayClauses(parts, polite, t);
  const sentence = clauses.map((clause) => clause.text).join(" ");

  const labels: Record<SayKey, string> = { fact: t("sayIt.fact"), feel: t("sayIt.feel"), want: t("sayIt.want") };
  const placeholders: Record<SayKey, string> = { fact: t("sayIt.factPlaceholder"), feel: t("sayIt.feelPlaceholder"), want: t("sayIt.wantPlaceholder") };
  const sources: Record<SayKey, string> = {
    fact: record.factFrom === "quick" ? t("recordDetail.quickContext") : t("summary.context"),
    feel: t("summary.words"),
    want: t("summary.concerns"),
  };
  /** Where a line came from: the record's own label while it is unchanged, 직접 적음 once it differs, nothing while empty. */
  const sourceOf = (key: SayKey) => {
    const value = parts[key].trim();
    if (!value) return "";
    return value === record.parts[key] ? t("sayIt.fromRecord", { name: sources[key] }) : t("sayIt.typed");
  };

  /** The threads: from each card to the top of the bubble. Side by side the cards drop straight down; stacked, the threads run down the right edge. */
  const draw = useCallback(() => {
    const root = fold.current;
    const target = bubble.current;
    if (!root || !target) return;
    const frame = root.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const first = cards.current.fact?.getBoundingClientRect();
    const second = cards.current.feel?.getBoundingClientRect();
    if (!first || !second || !frame.width) return;
    const inRow = Math.abs(first.top - second.top) < 1;
    const endY = to.top - frame.top + 1;
    const paths = {} as Record<SayKey, string>;
    SAY_KEYS.forEach((key, index) => {
      const card = cards.current[key]?.getBoundingClientRect();
      if (!card) return;
      if (inRow) {
        const startX = card.left - frame.left + card.width / 2;
        const startY = card.bottom - frame.top;
        const endX = to.left - frame.left + to.width / 2 + (index - 1) * 22;
        paths[key] = `M${startX} ${startY} C${startX} ${startY + 26} ${endX} ${endY - 26} ${endX} ${endY}`;
      } else {
        const startX = card.right - frame.left;
        const startY = card.top - frame.top + card.height / 2;
        const railX = frame.width - 8 - (2 - index) * 6;
        const endX = to.right - frame.left - 70 + (index - 1) * 16;
        paths[key] = `M${startX} ${startY} C${railX} ${startY} ${railX} ${startY} ${railX} ${startY + 24} L${railX} ${endY - 30} C${railX} ${endY - 12} ${endX} ${endY - 22} ${endX} ${endY}`;
      }
    });
    const box = `0 0 ${frame.width} ${frame.height}`;
    setThreads((current) => (current && current.box === box && SAY_KEYS.every((key) => current.paths[key] === paths[key]) ? current : { box, paths }));
  }, []);

  // A line grows with its text, so nothing is cut off; then the threads follow the new layout.
  useLayoutEffect(() => {
    for (const key of SAY_KEYS) {
      const field = fields.current[key];
      if (!field) continue;
      field.style.height = "auto";
      if (field.scrollHeight > 0) field.style.height = `${field.scrollHeight + 2}px`;
    }
    draw();
  });

  useEffect(() => {
    window.addEventListener("resize", draw);
    const observer = typeof ResizeObserver === "function" && fold.current ? new ResizeObserver(draw) : null;
    if (observer && fold.current) observer.observe(fold.current);
    void document.fonts?.ready?.then(draw);
    return () => { window.removeEventListener("resize", draw); observer?.disconnect(); };
  }, [draw]);

  /** One pass of light along a line's thread, and a brief tint on its part of the sentence. */
  const pulse = useCallback((key: SayKey) => {
    if (reducedMotion()) return;
    setTinted(key);
    timers.current.push(window.setTimeout(() => setTinted((current) => (current === key ? null : current)), TINT_MS));
    const light = lights.current[key];
    if (!light || typeof light.animate !== "function" || typeof light.getTotalLength !== "function") return;
    const length = light.getTotalLength();
    if (!length) return;
    light.style.strokeDasharray = `${LIGHT_LENGTH} ${length}`;
    light.animate([{ strokeDashoffset: LIGHT_LENGTH, opacity: 1 }, { strokeDashoffset: -length, opacity: 1 }], { duration: LIGHT_MS, easing: "ease-in-out" });
  }, []);

  useEffect(() => {
    if (play) SAY_KEYS.forEach((key, index) => { if (record.parts[key]) timers.current.push(window.setTimeout(() => pulse(key), 200 + index * 220)); });
    const pending = timers.current;
    const typed = typing.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      Object.values(typed).forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(copyTimer.current);
    };
  }, [play, pulse, record]);

  const resetCopied = () => { window.clearTimeout(copyTimer.current); setCopied("no"); };

  const change = (key: SayKey, value: string) => {
    setParts((current) => ({ ...current, [key]: value }));
    resetCopied();
    window.clearTimeout(typing.current[key]);
    typing.current[key] = window.setTimeout(() => pulse(key), TYPING_PAUSE_MS);
  };

  const copy = async () => {
    let done = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(sentence); done = true; }
    } catch { done = false; }
    if (!done) done = copyBySelection(sentence);
    window.clearTimeout(copyTimer.current);
    setCopied(done ? "yes" : "failed");
    if (done) copyTimer.current = window.setTimeout(() => setCopied("no"), COPIED_MS);
  };

  return <section className={styles.area} aria-label={label} data-say-it>
    {SAY_KEYS.some((key) => record.parts[key]) && <p className="small-note">{t("sayIt.hint")}</p>}

    <div className={styles.fold} ref={fold}>
      <svg className={styles.threads} viewBox={threads?.box} aria-hidden="true" focusable="false">
        {threads && SAY_KEYS.map((key) => <g key={key} className={TONE[key]}>
          <path className={`${styles.thread} ${parts[key].trim() ? "" : styles.threadEmpty}`} d={threads.paths[key]} />
          <path className={styles.light} d={threads.paths[key]} ref={(node) => { lights.current[key] = node; }} />
        </g>)}
      </svg>

      <div className={styles.cards}>
        {SAY_KEYS.map((key) => <div key={key} className={`${styles.card} ${TONE[key]} ${parts[key].trim() ? "" : styles.cardEmpty}`} ref={(node) => { cards.current[key] = node; }}>
          <label className={styles.label} htmlFor={`${id}-${key}`}>{labels[key]}</label>
          <span className={styles.from} id={`${id}-${key}-from`}>{sourceOf(key)}</span>
          <textarea className={styles.input} id={`${id}-${key}`} rows={1} maxLength={INPUT_LIMITS.text} value={parts[key]} placeholder={placeholders[key]} aria-describedby={`${id}-${key}-from`} ref={(node) => { fields.current[key] = node; }} onChange={(event) => change(key, event.target.value)} />
        </div>)}
      </div>

      <div className={styles.bubbleWrap}>
        <div className={styles.bubble} ref={bubble}>
          <div className={styles.bubbleHead}>
            <span className={styles.saidName} id={`${id}-said`}>{t("sayIt.saidName")}</span>
            {!english && <span className={styles.tone} role="group" aria-label={t("sayIt.tone")}>
              <button type="button" aria-pressed={!polite} onClick={() => { setPolite(false); resetCopied(); }}>{t("sayIt.casual")}</button>
              <button type="button" aria-pressed={polite} onClick={() => { setPolite(true); resetCopied(); }}>{t("sayIt.polite")}</button>
            </span>}
          </div>
          {clauses.length
            ? <p className={styles.said} aria-labelledby={`${id}-said`} data-said>{clauses.map((clause, index) => <span key={clause.key}>{index > 0 && " "}<span className={`${styles.part} ${TONE[clause.key]} ${tinted === clause.key ? styles.tinted : ""}`}>{clause.text}</span></span>)}</p>
            : <p className={styles.saidEmpty}>{t("sayIt.saidEmpty")}</p>}
        </div>
      </div>
    </div>

    <p className={styles.notSent}>{t("sayIt.notSent")}</p>
    <div className={styles.actions}>
      <button type="button" className="primary-button" disabled={!clauses.length} onClick={copy}>{copied === "yes" ? t("sayIt.copied") : t("sayIt.copy")}</button>
      <button type="button" className="secondary-button" aria-pressed={held} onClick={() => setHeld((current) => !current)}>{t("sayIt.hold")}</button>
    </div>
    <p className={copied === "failed" ? styles.after : "visually-hidden"} role="status">{copied === "yes" ? t("sayIt.copied") : copied === "failed" ? t("sayIt.copyFailed") : ""}</p>
    {held && <p className={styles.after}>{t("sayIt.held")}</p>}
    {english && <p className="draft-note">{enOnly.draftNote}</p>}
  </section>;
}
