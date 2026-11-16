"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./voice-note.module.css";
import { useT } from "../lib/i18n/react";
import type { VoiceNote as VoiceNoteMeta, VoiceStep } from "../lib/session-types";
import { getVoiceStore } from "../lib/voice-store";
import { formatClock, levelOf, MAX_VOICE_SECONDS, pickMimeType } from "../lib/voice-recorder";

/**
 * 말로 남기기 (owner's decision 2026-11-16: recording only), under the two
 * 무슨 일이 있었나요 fields. The shape follows Kokonut UI's Voice input; the code is
 * written here, with no package. Nothing is asked of the microphone until
 * 녹음 시작 is pressed after the notice, and nothing moves before that: no demo,
 * no made-up wave. While recording, the bars are the microphone's own level,
 * measured in this browser (AnalyserNode); with reduced motion they give way to
 * the elapsed time. The sound is kept in IndexedDB (lib/voice-store.ts) and the
 * record says only that there is one. Nothing reads, transcribes or sends it,
 * and the step works the same without it.
 */
type Phase = "closed" | "notice" | "starting" | "recording" | "unavailable";

const BARS = 24;
/** How often the bars are redrawn while recording, in ms: often enough to follow a voice. */
const BAR_EVERY = 80;

const reducedMotion = () => typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Live = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  mimeType: string;
  startedAt: number;
  context?: AudioContext;
  frame?: number;
  tick?: ReturnType<typeof setInterval>;
  limit?: ReturnType<typeof setTimeout>;
  hitLimit: boolean;
};

export function VoiceNote({ sessionId, step, note, onSaved, onRemoved }: { sessionId: string; step: VoiceStep; note?: VoiceNoteMeta; onSaved: (note: VoiceNoteMeta) => void; onRemoved: () => void }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("closed");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [still, setStill] = useState(true);
  const [limitNote, setLimitNote] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const live = useRef<Live | null>(null);
  const noticeText = useRef<HTMLParagraphElement>(null);
  const alive = useRef(true);
  const latest = useRef({ sessionId, step, onSaved });
  latest.current = { sessionId, step, onSaved };

  useEffect(() => {
    if (phase === "notice") noticeText.current?.focus();
  }, [phase]);

  /** Lets go of the microphone and the analyser; the recorder's stop event saves what was recorded. */
  const stopRecording = () => {
    const current = live.current;
    if (!current) return;
    if (current.tick) clearInterval(current.tick);
    if (current.limit) clearTimeout(current.limit);
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    if (current.recorder.state !== "inactive") current.recorder.stop();
    current.stream.getTracks().forEach((track) => track.stop());
    current.context?.close().catch(() => undefined);
  };

  const finish = async (current: Live) => {
    live.current = null;
    const seconds = Math.min(MAX_VOICE_SECONDS, Math.round((Date.now() - current.startedAt) / 1000));
    const blob = new Blob(current.chunks, current.mimeType ? { type: current.mimeType } : undefined);
    const meta: VoiceNoteMeta = { step: latest.current.step, mimeType: blob.type || current.mimeType, seconds, at: new Date().toISOString() };
    const saved = blob.size > 0 && await getVoiceStore().save({ sessionId: latest.current.sessionId, ...meta, blob });
    // saved even when the person has already left the step, so nothing recorded is lost
    if (saved) latest.current.onSaved(meta);
    if (!alive.current) return;
    setPhase("closed");
    setLimitNote(saved && current.hitLimit);
    setSaveFailed(!saved);
  };

  const start = async () => {
    setPhase("starting");
    setLimitNote(false);
    setSaveFailed(false);
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia || typeof MediaRecorder === "undefined") return setPhase("unavailable");
    let stream: MediaStream;
    try {
      stream = await media.getUserMedia({ audio: true });
    } catch {
      return alive.current ? setPhase("unavailable") : undefined;
    }
    if (!alive.current) return stream.getTracks().forEach((track) => track.stop());
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      return setPhase("unavailable");
    }
    const current: Live = { stream, recorder, chunks: [], mimeType: recorder.mimeType || mimeType, startedAt: Date.now(), hitLimit: false };
    recorder.ondataavailable = (event) => { if (event.data.size > 0) current.chunks.push(event.data); };
    recorder.onstop = () => { void finish(current); };
    live.current = current;
    recorder.start();
    setElapsed(0);
    current.tick = setInterval(() => setElapsed(Math.floor((Date.now() - current.startedAt) / 1000)), 1000);
    current.limit = setTimeout(() => { current.hitLimit = true; stopRecording(); }, MAX_VOICE_SECONDS * 1000);

    const quiet = reducedMotion();
    setStill(quiet);
    setLevels([]);
    if (!quiet && typeof AudioContext !== "undefined" && typeof requestAnimationFrame === "function") {
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        // measured only: the analyser is not connected to the speakers or anywhere else
        context.createMediaStreamSource(stream).connect(analyser);
        current.context = context;
        const samples = new Uint8Array(analyser.fftSize);
        let last = 0;
        const draw = (now: number) => {
          if (now - last >= BAR_EVERY) {
            last = now;
            analyser.getByteTimeDomainData(samples);
            const level = levelOf(samples);
            setLevels((previous) => [...previous, level].slice(-BARS));
          }
          current.frame = requestAnimationFrame(draw);
        };
        current.frame = requestAnimationFrame(draw);
      } catch {
        setStill(true);
      }
    }
    setPhase("recording");
  };

  // leaving the step while recording stops and keeps the recording
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopRecording();
    };
  }, []);

  if (note) return <div className={styles.voice}>
    <VoicePlayback sessionId={sessionId} step={step} at={note.at} onDelete={onRemoved} />
    {limitNote && <p className="small-note" role="status">{t("voice.limit")}</p>}
  </div>;

  return <div className={styles.voice}>
    {(phase === "closed" || phase === "unavailable") && <button className={`secondary-button ${styles.open}`} onClick={() => setPhase("notice")}><MicIcon />{t("voice.open")}</button>}
    {phase === "unavailable" && <p className="small-note" role="status">{t("voice.unavailable")}</p>}
    {saveFailed && <p className="small-note" role="status">{t("common.saveFailed")}</p>}
    {(phase === "notice" || phase === "starting") && <div className={styles.notice}>
      <p className={styles.noticeText} ref={noticeText} tabIndex={-1}>{t("voice.notice")}</p>
      <div className="quick-option-row">
        <button className="secondary-button" disabled={phase === "starting"} onClick={() => void start()}>{t("voice.start")}</button>
        <button className="quiet-button" disabled={phase === "starting"} onClick={() => setPhase("closed")}>{t("voice.writeOnly")}</button>
      </div>
    </div>}
    {phase === "recording" && <div className={styles.recording}>
      <p className={styles.status} role="status"><span className={styles.dot} aria-hidden="true" />{t("voice.recording")} <span className={styles.clock}>{formatClock(elapsed)}</span></p>
      {!still && <LevelBars levels={levels} />}
      <button className="secondary-button" onClick={stopRecording}>{t("voice.stop")}</button>
    </div>}
  </div>;
}

/** The microphone's own level, newest on the right; empty places wait as flat lines. */
function LevelBars({ levels }: { levels: number[] }) {
  const width = BARS * 6;
  const padded = [...Array(BARS - levels.length).fill(0), ...levels];
  return <svg className={styles.bars} viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" aria-hidden="true" data-testid="voice-level-bars">
    {padded.map((level, index) => {
      const height = Math.max(2, level * 30);
      return <rect key={index} x={index * 6 + 1} y={16 - height / 2} width={4} height={height} rx={2} />;
    })}
  </svg>;
}

/**
 * One recording played back from this browser's storage, with its delete. The
 * blob: address is let go when the player leaves the screen or the sound
 * changes. A record whose sound is not on this device shows nothing here.
 */
export function VoicePlayback({ sessionId, step, at, label, onDelete }: { sessionId: string; step: VoiceStep; at: string; label?: string; onDelete: () => void }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let cancelled = false;
    getVoiceStore().load(sessionId, step).then((clip) => {
      if (cancelled || !clip) return;
      made = URL.createObjectURL(clip.blob);
      setUrl(made);
    }, () => undefined);
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [sessionId, step, at]);
  if (!url) return null;
  const remove = async () => {
    await getVoiceStore().remove(sessionId, step).catch(() => undefined);
    onDelete();
  };
  return <div className={styles.player}>
    {label && <p className="field-label">{label}</p>}
    <audio className={styles.audio} controls preload="metadata" src={url} aria-label={label ?? t("voice.open")} />
    <div className="quick-option-row"><button className="quiet-button" onClick={() => void remove()}>{t("voice.delete")}</button></div>
  </div>;
}

function MicIcon() {
  return <svg className={styles.mic} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>;
}
