import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, sessionReducer, type EmotionSession } from "../lib/session-types";
import { getStorageAdapter, localStorageAdapter, type StorageAdapter } from "../lib/storage-adapter";
import { getStorageKeys } from "../lib/storage";

const quickDraft = (): EmotionSession => sessionReducer(createSession(), { type: "START_QUICK" });
const asCompleted = (session: EmotionSession): EmotionSession => ({ ...session, status: "completed" });

/** 어댑터마다 같은 계약을 통과해야 한다. 지금은 localStorage 하나뿐이다. */
const adapters: Array<[string, () => StorageAdapter, () => void]> = [
  ["localStorage", () => localStorageAdapter, () => window.localStorage.clear()],
];

describe.each(adapters)("StorageAdapter contract: %s", (_name, make, reset) => {
  let storage: StorageAdapter;
  beforeEach(() => {
    reset();
    storage = make();
  });

  it("1. 임시 저장: 초안을 저장하고 다시 읽는다", () => {
    expect(storage.loadDraft()).toBeNull();
    const draft = quickDraft();
    storage.saveDraft(draft);
    expect(storage.loadDraft()).toEqual(draft);
    expect(storage.loadCompleted()).toEqual([]);
  });

  it("2. 완료 저장: 완료 목록에 들어가고 초안은 건드리지 않는다", () => {
    const draft = quickDraft();
    storage.saveDraft(draft);
    const done = asCompleted({ ...quickDraft(), id: "done-1" });
    storage.saveCompleted(done);
    expect(storage.loadCompleted()).toEqual([done]);
    expect(storage.loadDraft()?.id).toBe(draft.id);
  });

  it("3. 같은 id로 다시 저장하면 새 기록이 아니라 갱신이다", () => {
    const first = asCompleted({ ...quickDraft(), id: "same" });
    const other = asCompleted({ ...quickDraft(), id: "other" });
    storage.saveCompleted(first);
    storage.saveCompleted(other);
    const updated = { ...first, stopReason: "user" as const };
    storage.saveCompleted(updated);
    const stored = storage.loadCompleted();
    expect(stored).toHaveLength(2);
    expect(stored.filter((item) => item.id === "same")).toEqual([updated]);
    expect(stored.map((item) => item.id)).toEqual(["same", "other"]);
  });

  it("4. 삭제: 지정한 id만 지우고, 없는 id는 아무 일도 하지 않는다", () => {
    storage.saveCompleted(asCompleted({ ...quickDraft(), id: "a" }));
    storage.saveCompleted(asCompleted({ ...quickDraft(), id: "b" }));
    storage.dropCompleted("a");
    expect(storage.loadCompleted().map((item) => item.id)).toEqual(["b"]);
    storage.dropCompleted("missing");
    expect(storage.loadCompleted().map((item) => item.id)).toEqual(["b"]);
  });

  it("5. 초안 제거: 초안만 지우고 완료 기록은 남긴다", () => {
    storage.saveCompleted(asCompleted({ ...quickDraft(), id: "keep" }));
    storage.saveDraft(quickDraft());
    storage.removeDraft();
    expect(storage.loadDraft()).toBeNull();
    expect(storage.loadCompleted().map((item) => item.id)).toEqual(["keep"]);
  });

  it("6. persistSession: 완료로 저장하면 초안이 비고, 다시 열면 완료 목록에서 빠진다", () => {
    const draft = quickDraft();
    storage.persistSession(draft);
    expect(storage.loadDraft()?.id).toBe(draft.id);

    storage.persistSession(asCompleted(draft));
    expect(storage.loadDraft()).toBeNull();
    expect(storage.loadCompleted().map((item) => item.id)).toEqual([draft.id]);

    storage.persistSession({ ...draft, status: "draft" });
    expect(storage.loadCompleted()).toEqual([]);
    expect(storage.loadDraft()?.id).toBe(draft.id);
  });

  it("7. 구조 분해해서 써도 동작한다 (this에 의존하지 않는다)", () => {
    const { saveCompleted, loadCompleted } = storage;
    saveCompleted(asCompleted({ ...quickDraft(), id: "destructured" }));
    expect(loadCompleted().map((item) => item.id)).toEqual(["destructured"]);
  });
});

describe("localStorage adapter: 기존 저장 방식 그대로", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("getStorageAdapter는 지금 localStorage 어댑터를 돌려준다", () => {
    expect(getStorageAdapter()).toBe(localStorageAdapter);
  });

  it("저장 키와 JSON 형식이 바뀌지 않았다", () => {
    expect(getStorageKeys()).toEqual({ DRAFT_KEY: "emotion-lab:draft:v4", COMPLETED_KEY: "emotion-lab:completed:v4" });
    const draft = quickDraft();
    const done = asCompleted({ ...quickDraft(), id: "fmt" });
    localStorageAdapter.saveDraft(draft);
    localStorageAdapter.saveCompleted(done);
    expect(window.localStorage.getItem("emotion-lab:draft:v4")).toBe(JSON.stringify(draft));
    expect(window.localStorage.getItem("emotion-lab:completed:v4")).toBe(JSON.stringify([done]));
  });

  it("초안을 먼저 쓰고 나서 완료 목록에서 지운다 (둘 다 비는 순간이 없다)", () => {
    const draft = quickDraft();
    localStorageAdapter.saveCompleted(asCompleted(draft));
    const calls: string[] = [];
    const setItem = Storage.prototype.setItem;
    const removeItem = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      calls.push(`set:${key}`);
      return setItem.call(this, key, value);
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (this: Storage, key: string) {
      calls.push(`remove:${key}`);
      return removeItem.call(this, key);
    });
    localStorageAdapter.persistSession({ ...draft, status: "draft" });
    expect(calls).toEqual(["set:emotion-lab:draft:v4", "set:emotion-lab:completed:v4"]);
  });

  it("읽을 수 없는 저장값이 있어도 던지지 않는다", () => {
    window.localStorage.setItem("emotion-lab:completed:v4", "{not json");
    expect(localStorageAdapter.loadCompleted()).toEqual([]);
  });
});

describe("저장 경로는 네트워크를 쓰지 않는다", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("모든 저장 동작 중 fetch, XHR, sendBeacon, WebSocket이 호출되지 않는다", () => {
    const fetchSpy = vi.fn();
    const xhrSpy = vi.fn();
    const beaconSpy = vi.fn();
    const wsSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("XMLHttpRequest", xhrSpy);
    vi.stubGlobal("WebSocket", wsSpy);
    Object.defineProperty(navigator, "sendBeacon", { value: beaconSpy, configurable: true });

    const draft = quickDraft();
    const adapter = getStorageAdapter();
    adapter.saveDraft(draft);
    adapter.loadDraft();
    adapter.persistSession(asCompleted(draft));
    adapter.saveCompleted(asCompleted({ ...draft, id: "x" }));
    adapter.loadCompleted();
    adapter.dropCompleted("x");
    adapter.removeDraft();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
    expect(wsSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    delete (navigator as unknown as Record<string, unknown>).sendBeacon;
  });

  it("저장 코드에 네트워크 API 사용이 없다 (정적 확인)", () => {
    for (const file of ["lib/storage.ts", "lib/storage-adapter.ts"]) {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|https?:\/\//);
    }
  });
});
