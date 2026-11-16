import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import Home from "../app/(ko)/page";
import { VoiceNote } from "../app/voice-note";
import { I18nProvider } from "../lib/i18n/react";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { createSession, sessionReducer, type EmotionSession, type VoiceNote as VoiceNoteMeta } from "../lib/session-types";
import { loadCompleted, loadDraft, persistSession, saveCompleted } from "../lib/storage";
import { buildExport, parseImport, serializeExport } from "../lib/record-transfer";
import { memoryVoiceStore, setVoiceStore } from "../lib/voice-store";
import { formatClock, levelOf, MAX_VOICE_SECONDS, pickMimeType } from "../lib/voice-recorder";
import { startQuick } from "./helpers/start";

/**
 * 말로 남기기 (owner's decision 2026-11-16: recording only). jsdom has no
 * microphone, MediaRecorder, AudioContext or IndexedDB, so each is a small
 * stand-in here and the sound goes to the memory store (lib/voice-store.ts).
 */
let store: ReturnType<typeof memoryVoiceStore>;
const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] };
const getUserMedia = vi.fn();
const contextClose = vi.fn(() => Promise.resolve());
const raf = vi.fn((callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16) as unknown as number);
let reduced = false;

class FakeRecorder {
  static isTypeSupported = (type: string) => type === "audio/webm;codecs=opus";
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_stream: unknown, options?: { mimeType?: string }) { this.mimeType = options?.mimeType ?? ""; }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["not really sound"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

class FakeAudioContext {
  close = contextClose;
  createAnalyser() { return { fftSize: 0, getByteTimeDomainData: (samples: Uint8Array) => samples.fill(200) }; }
  createMediaStreamSource() { return { connect: vi.fn() }; }
}

beforeEach(() => {
  window.localStorage.clear();
  store = memoryVoiceStore();
  setVoiceStore(store);
  reduced = false;
  track.stop.mockClear();
  contextClose.mockClear();
  raf.mockClear();
  getUserMedia.mockReset().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") && reduced, addEventListener() {}, removeEventListener() {} }));
  URL.createObjectURL = vi.fn(() => "blob:voice-note");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** The quick look's second step, where 무슨 일이 있었나요 is. */
const toQuickCandidates = () => {
  render(<Home />);
  startQuick();
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
};

const record = async () => {
  fireEvent.click(screen.getByRole("button", { name: ko.voice.open }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: ko.voice.start })); });
  await screen.findByRole("button", { name: ko.voice.stop });
};

const finished = (id: string, voiceNotes?: VoiceNoteMeta[]): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
  const done = { ...sessionReducer(state, { type: "COMPLETE_QUICK" }), id };
  return voiceNotes ? { ...done, voiceNotes } : done;
};
const note: VoiceNoteMeta = { step: "quick-context", mimeType: "audio/webm;codecs=opus", seconds: 4, at: "2026-11-16T03:00:00.000Z" };
const keepSound = (sessionId: string) => store.save({ sessionId, ...note, blob: new Blob(["x"]) });

describe("말로 남기기 under 무슨 일이 있었나요", () => {
  it("is offered under the field on both steps, and asks for the microphone only after 녹음 시작", async () => {
    toQuickCandidates();
    const field = document.getElementById("quick-event")!;
    const open = screen.getByRole("button", { name: ko.voice.open });
    expect(field.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(open);
    expect(screen.getByText(ko.voice.notice)).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: ko.voice.writeOnly }));
    expect(screen.queryByText(ko.voice.notice)).toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
    await record();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it("keeps the sound in the browser store and only its mark, format and length in the record", async () => {
    toQuickCandidates();
    await record();
    fireEvent.click(screen.getByRole("button", { name: ko.voice.stop }));
    await waitFor(() => expect(document.querySelector("audio")).not.toBeNull());
    expect(store.clips.size).toBe(1);
    const [clip] = store.clips.values();
    expect(clip).toMatchObject({ sessionId: loadDraft()!.id, step: "quick-context", mimeType: "audio/webm;codecs=opus" });
    expect(loadDraft()!.voiceNotes).toEqual([{ step: "quick-context", mimeType: "audio/webm;codecs=opus", seconds: expect.any(Number), at: expect.any(String) }]);
    expect(window.localStorage.getItem("emotion-lab:draft:v4")).not.toContain("not really sound");
    // the microphone and the analyser are let go
    expect(track.stop).toHaveBeenCalled();
    expect(contextClose).toHaveBeenCalled();
    expect(document.querySelector("audio")!.getAttribute("src")).toBe("blob:voice-note");
  });

  it("says the microphone is not available when refused, and the written line still saves", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    toQuickCandidates();
    fireEvent.click(screen.getByRole("button", { name: ko.voice.open }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: ko.voice.start })); });
    expect(await screen.findByText(ko.voice.unavailable)).toBeInTheDocument();
    fireEvent.change(document.getElementById("quick-event")!, { target: { value: "회의에서 말이 막혔다" } });
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.finish }));
    expect(loadCompleted()[0].quickCheck?.context?.eventText).toBe("회의에서 말이 막혔다");
    expect(loadCompleted()[0].voiceNotes).toBeUndefined();
    expect(store.clips.size).toBe(0);
  });

  it("is offered on the slower look's 무슨 일이 있었나요 too", async () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = sessionReducer(state, { type: "SET_BODY", body: [] });
    state = sessionReducer(state, { type: "SET_AFFECT", affect: { unknown: true } });
    persistSession(state);
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
    expect(screen.getByRole("heading", { level: 1, name: ko.context.title })).toBeInTheDocument();
    await record();
    fireEvent.click(screen.getByRole("button", { name: ko.voice.stop }));
    await waitFor(() => expect(loadDraft()!.voiceNotes?.[0].step).toBe("context"));
  });
});

/** The component alone, with the record held by the test. */
function Harness({ onSaved }: { onSaved: (note: VoiceNoteMeta) => void }) {
  const [held, setHeld] = useState<VoiceNoteMeta>();
  return <I18nProvider locale="ko"><VoiceNote sessionId="s1" step="quick-context" note={held} onSaved={(saved) => { onSaved(saved); setHeld(saved); }} onRemoved={() => setHeld(undefined)} /></I18nProvider>;
}

describe("while recording", () => {
  it("stops on its own at three minutes, keeps the three minutes and says so", async () => {
    vi.useFakeTimers();
    const onSaved = vi.fn();
    render(<Harness onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: ko.voice.open }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: ko.voice.start })); });
    expect(screen.getByRole("button", { name: ko.voice.stop })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(MAX_VOICE_SECONDS * 1000 - 1000); });
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ seconds: MAX_VOICE_SECONDS }));
    expect(screen.getByText(ko.voice.limit)).toBeInTheDocument();
    expect(track.stop).toHaveBeenCalled();
    expect(store.clips.size).toBe(1);
  });

  it("shows the microphone's own level as bars, measured in the browser", async () => {
    render(<Harness onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: ko.voice.open }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: ko.voice.start })); });
    expect(screen.getByTestId("voice-level-bars")).toBeInTheDocument();
    expect(raf).toHaveBeenCalled();
  });

  it("with reduced motion, shows the time in words in place of the bars", async () => {
    reduced = true;
    vi.useFakeTimers();
    render(<Harness onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: ko.voice.open }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: ko.voice.start })); });
    expect(screen.queryByTestId("voice-level-bars")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000); });
    expect(screen.getByRole("status").textContent).toBe(`${ko.voice.recording} 0:12`);
    expect(raf).not.toHaveBeenCalled();
  });

  it("does nothing on its own: ten quiet seconds change nothing and touch no microphone", async () => {
    vi.useFakeTimers();
    const { container } = render(<Harness onSaved={vi.fn()} />);
    const before = container.innerHTML;
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(container.innerHTML).toBe(before);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });
});

describe("deleting takes the sound too", () => {
  it("이 녹음 지우기 on the step removes the sound and the record's mark", async () => {
    toQuickCandidates();
    await record();
    fireEvent.click(screen.getByRole("button", { name: ko.voice.stop }));
    fireEvent.click(await screen.findByRole("button", { name: ko.voice.delete }));
    await waitFor(() => expect(loadDraft()!.voiceNotes).toBeUndefined());
    expect(store.clips.size).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:voice-note");
    expect(screen.getByRole("button", { name: ko.voice.open })).toBeInTheDocument();
  });

  it("이 기기의 기록 모두 지우기 leaves no sound in the browser store", async () => {
    saveCompleted(finished("a", [note]));
    await keepSound("a");
    await keepSound("orphan");
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.storageManage }));
    fireEvent.click(screen.getByRole("button", { name: ko.recordTransfer.deleteAll }));
    fireEvent.click(screen.getByRole("button", { name: ko.recordTransfer.deleteAllConfirm }));
    await waitFor(() => expect(store.clips.size).toBe(0));
    expect(loadCompleted()).toEqual([]);
  });

  it("이 기록을 지우기 on a stopped record removes its sound", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true, configurable: true });
    toQuickCandidates();
    await record();
    fireEvent.click(screen.getByRole("button", { name: ko.voice.stop }));
    await waitFor(() => expect(store.clips.size).toBe(1));
    fireEvent.click(screen.getByRole("button", { name: "그만하기" }));
    fireEvent.click(screen.getByRole("button", { name: "여기서 그만하기" }));
    fireEvent.click(screen.getByRole("button", { name: ko.stopped.delete }));
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(store.clips.size).toBe(0);
  });

  it("a past record plays its recording back and deletes it with 이 녹음 지우기", async () => {
    saveCompleted(finished("a", [note]));
    await keepSound("a");
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.getElementById("record-a")!);
    await waitFor(() => expect(document.querySelector("audio")).not.toBeNull());
    expect(document.querySelector("audio")!.getAttribute("aria-label")).toBe(ko.recordDetail.quickContext);
    fireEvent.click(screen.getByRole("button", { name: ko.voice.delete }));
    await waitFor(() => expect(loadCompleted()[0].voiceNotes).toBeUndefined());
    expect(store.clips.size).toBe(0);
    expect(document.querySelector("audio")).toBeNull();
  });

  it("a past record whose sound is not on this device shows no player", async () => {
    saveCompleted(finished("a", [note]));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.getElementById("record-a")!);
    await act(async () => {});
    expect(document.querySelector("audio")).toBeNull();
  });

  it("discarding the waiting draft to start again removes its sound", async () => {
    const draft = { ...finished("d"), status: "draft" as const, stage: "quick-candidates" as const, voiceNotes: [note] };
    persistSession(draft);
    await keepSound("d");
    await keepSound("kept");
    render(<Home />);
    startQuick();
    fireEvent.click(screen.getByRole("button", { name: ko.landing.draftConfirm.discard }));
    await waitFor(() => expect([...store.clips.values()].map((clip) => clip.sessionId)).toEqual(["kept"]));
  });
});

describe("export and import", () => {
  it("the file marks where a recording was, with no format, length or sound", () => {
    const file = buildExport([finished("a", [note]), finished("b")]);
    expect(file.records[0].voiceNotes).toEqual([{ step: "quick-context" }]);
    expect(file.records[1]).not.toHaveProperty("voiceNotes");
  });

  it("importing drops the mark, whatever its shape, without refusing the record", () => {
    const text = serializeExport(buildExport([finished("a", [note])]));
    const parsed = parseImport(text);
    expect(parsed.ok && parsed.records[0].id).toBe("a");
    expect(parsed.ok && parsed.records[0]).not.toHaveProperty("voiceNotes");
    const odd = JSON.parse(text);
    odd.records[0].voiceNotes = "something else";
    const again = parseImport(JSON.stringify(odd));
    expect(again).toMatchObject({ ok: true, invalid: 0 });
  });
});

describe("headers and pieces", () => {
  it("lets this site, and only this site, use the microphone and play blob: sound", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toContain("microphone=(self)");
    expect(config).not.toContain("microphone=()");
    expect(config).toContain(`"media-src 'self' blob:"`);
  });

  it("says the same in both languages' wording, without dashes", () => {
    expect(Object.keys(en.voice)).toEqual(Object.keys(ko.voice));
    expect(ko.landing.storageNote.endsWith("녹음도 같은 기기를 쓰는 사람은 들을 수 있습니다.")).toBe(true);
  });

  it("picks the first format the browser can record, or lets the browser choose", () => {
    expect(pickMimeType((type) => type === "audio/mp4")).toBe("audio/mp4");
    expect(pickMimeType(() => false)).toBe("");
    expect(pickMimeType(() => { throw new Error("no"); })).toBe("");
  });

  it("measures the level from the waveform bytes, between 0 and 1", () => {
    expect(levelOf(new Uint8Array(64).fill(128))).toBe(0);
    expect(levelOf(new Uint8Array(64).fill(255))).toBe(1);
    expect(levelOf(new Uint8Array(0))).toBe(0);
  });

  it("writes the time like a clock", () => {
    expect(formatClock(12)).toBe("0:12");
    expect(formatClock(180)).toBe("3:00");
  });
});
