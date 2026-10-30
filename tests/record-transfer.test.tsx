import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "../app/(ko)/page";
import {
  applyImport, buildExport, EXPORT_FORMAT, exportFileName, isSessionShape, localDate, MAX_IMPORT_BYTES,
  parseImport, planImport, serializeExport,
} from "../lib/record-transfer";
import type { EmotionSession } from "../lib/session-types";
import { getStorageKeys } from "../lib/storage";
import { getStorageAdapter } from "../lib/storage-adapter";
import { ko } from "../lib/i18n/messages.ko";

const record = (id: string, extra: Partial<EmotionSession> = {}): EmotionSession => ({
  id,
  createdAt: "2026-10-01T09:00:00.000Z",
  completedAt: "2026-10-01T09:04:00.000Z",
  status: "completed",
  stage: "quick-summary",
  entry: "quick",
  locale: "ko",
  quickCheck: { affect: { valence: 0.3, activation: 0.6 }, candidatePool: [{ label: "긴장", source: "suggested" }], selected: [{ label: "긴장", source: "suggested" }] },
  ...extra,
});

const storage = getStorageAdapter();
const seed = (sessions: EmotionSession[]) => window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(sessions));
const ids = () => storage.loadCompleted().map((session) => session.id);
const importText = (text: string) => {
  const parsed = parseImport(text);
  if (!parsed.ok) throw new Error(parsed.error);
  const plan = planImport(parsed, storage.loadCompleted());
  return { plan, added: applyImport(plan, storage) };
};

describe("export file", () => {
  it("names the file with the date only and stamps the date without a time", () => {
    const now = new Date(2026, 9, 11, 23, 59, 30);
    expect(exportFileName(now)).toBe("emotion-observatory-records-2026-10-11.json");
    expect(localDate(now)).toBe("2026-10-11");
    const file = buildExport([record("a")], now);
    expect(file).toEqual({ format: EXPORT_FORMAT, formatVersion: 1, exportedDate: "2026-10-11", records: [record("a")] });
    expect(JSON.parse(serializeExport(file)).exportedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("import and export round trip", () => {
  beforeEach(() => window.localStorage.clear());

  it("re-importing an exported file keeps the same records, with no duplicates", () => {
    const sessions = [record("a"), record("b", { status: "stopped", stage: "stopped", stopReason: "user" }), record("c", { entry: "deep", deepReflection: { startedAt: "2026-10-01T09:00:00.000Z", body: [{ label: "어깨가 뭉침" }], concerns: ["인정받는 것"], emotionCandidates: [{ label: "서운함", source: "suggested" }] } })];
    seed(sessions);
    const text = serializeExport(buildExport(storage.loadCompleted()));

    const again = importText(text);
    expect(again.added).toBe(0);
    expect(again.plan.duplicates).toBe(3);
    expect(storage.loadCompleted()).toEqual(sessions);

    window.localStorage.clear();
    const restored = importText(text);
    expect(restored.added).toBe(3);
    expect(storage.loadCompleted()).toEqual(sessions);
  });

  it("does not touch the draft", () => {
    storage.saveDraft({ ...record("draft-1"), status: "draft", stage: "quick-candidates" });
    seed([record("a")]);
    const file = buildExport(storage.loadCompleted());
    expect(file.records.map((session) => session.id)).toEqual(["a"]);
    importText(serializeExport(buildExport([record("new")])));
    expect(storage.loadDraft()?.id).toBe("draft-1");
  });
});

describe("refusing a file", () => {
  beforeEach(() => window.localStorage.clear());

  it.each([
    ["broken JSON", "{ not json", "not-json"],
    ["an empty file", "", "not-json"],
    ["another app's JSON", JSON.stringify({ hello: "world" }), "unknown-format"],
    ["a bare array", JSON.stringify([record("a")]), "unknown-format"],
    ["a future version", JSON.stringify({ format: EXPORT_FORMAT, formatVersion: 2, exportedDate: "2026-10-11", records: [] }), "unsupported-version"],
    ["records that are not a list", JSON.stringify({ format: EXPORT_FORMAT, formatVersion: 1, exportedDate: "2026-10-11", records: {} }), "no-records"],
  ])("refuses %s and saves nothing", (_name, text, error) => {
    seed([record("keep")]);
    const before = window.localStorage.getItem(getStorageKeys().COMPLETED_KEY);
    expect(parseImport(text)).toEqual({ ok: false, error });
    expect(window.localStorage.getItem(getStorageKeys().COMPLETED_KEY)).toBe(before);
  });

  it("skips entries without the shape of a record and counts them", () => {
    const text = JSON.stringify({
      format: EXPORT_FORMAT, formatVersion: 1, exportedDate: "2026-10-11",
      records: [record("ok"), { id: "no-status" }, null, "text", record("bad-date", { createdAt: "yesterday" }), record("bad-list", { quickCheck: { candidatePool: [], selected: "긴장" as never } }), record("a-draft", { status: "draft" })],
    });
    const parsed = parseImport(text);
    expect(parsed).toMatchObject({ ok: true, invalid: 6 });
    const { added, plan } = importText(text);
    expect(added).toBe(1);
    expect(plan).toMatchObject({ total: 7, invalid: 6, duplicates: 0 });
    expect(ids()).toEqual(["ok"]);
  });

  it("keeps markup in a record as plain text", () => {
    const sneaky = record("x", { quickCheck: { candidatePool: [], selected: [{ label: "<img src=x onerror=alert(1)>", source: "custom" }] } });
    expect(isSessionShape(sneaky)).toBe(true);
  });
});

describe("same id", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps the record already here and skips the imported one", () => {
    const mine = record("same", { synthesisFeedback: { correction: "기기에 있던 것" } });
    seed([mine, record("other")]);
    const incoming = serializeExport(buildExport([record("same", { synthesisFeedback: { correction: "파일에 있던 것" } }), record("new-1"), record("new-2"), record("new-1")]));
    const { added, plan } = importText(incoming);
    expect(added).toBe(2);
    expect(plan.duplicates).toBe(2);
    expect(storage.loadCompleted().find((session) => session.id === "same")).toEqual(mine);
    expect(ids()).toEqual(["new-1", "new-2", "same", "other"]);
  });
});

describe("delete all", () => {
  beforeEach(() => window.localStorage.clear());

  it("removes completed, stopped and draft records from this device, under the same keys", () => {
    seed([record("a"), record("b", { status: "stopped", stage: "stopped" })]);
    storage.saveDraft({ ...record("d"), status: "draft" });
    storage.clearAll();
    expect(storage.loadCompleted()).toEqual([]);
    expect(storage.loadDraft()).toBeNull();
    expect(Object.keys(window.localStorage).every((key) => key.startsWith("emotion-lab:"))).toBe(true);
  });

  it("clears a corrupted stored value too, by removing the keys themselves", () => {
    const { COMPLETED_KEY, DRAFT_KEY } = getStorageKeys();
    window.localStorage.setItem(COMPLETED_KEY, "{not json");
    window.localStorage.setItem(DRAFT_KEY, "[also broken");
    window.localStorage.setItem("someone-else", "keep");
    storage.clearAll();
    expect(window.localStorage.getItem(COMPLETED_KEY)).toBeNull();
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(window.localStorage.getItem("someone-else")).toBe("keep");
    storage.saveCompleted(record("after"));
    expect(ids()).toEqual(["after"]);
  });
});

describe("no network", () => {
  it("the transfer code uses no network API (static check)", () => {
    const source = readFileSync("lib/record-transfer.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|https?:\/\//);
    expect(source).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });
});

describe("records screen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    URL.createObjectURL = vi.fn(() => "blob:local");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const openRecords = () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
  };
  const pick = (contents: string, size?: number) => {
    const file = new File([contents], "records.json", { type: "application/json" });
    if (size !== undefined) Object.defineProperty(file, "size", { value: size });
    fireEvent.change(screen.getByLabelText("가져올 기록 파일 고르기"), { target: { files: [file] } });
  };

  it("says the file is not encrypted, then downloads it without any request", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    seed([record("a")]);
    openRecords();
    expect(screen.getByText("암호를 정하지 않으면, 내보낸 파일에는 적은 내용이 그대로 들어 있고 암호화되지 않습니다.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "파일로 내보내기" }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/emotion-observatory-records-\d{4}-\d{2}-\d{2}\.json/);
    expect(document.body.textContent).not.toMatch(/안전하게|안심/);
  });

  it("asks before importing, shows the counts, and adds only new records", async () => {
    seed([record("here")]);
    openRecords();
    pick(serializeExport(buildExport([record("here"), record("new")])));
    await screen.findByText("이 파일에는 기록이 2개 있습니다. 그중 이미 이 기기에 있는 기록은 1개이고, 기록 모양이 아닌 항목은 0개입니다.");
    expect(ids()).toEqual(["here"]);
    fireEvent.click(screen.getByRole("button", { name: "가져오기" }));
    expect(ids()).toEqual(["new", "here"]);
    expect(screen.getByRole("status").textContent).toBe("기록 1개를 가져왔습니다. 이미 있던 기록 1개와 모양이 맞지 않는 항목 0개는 건너뛰었습니다.");
    expect(document.querySelectorAll(".record-row")).toHaveLength(2);
  });

  it("cancelling an import saves nothing", async () => {
    openRecords();
    pick(serializeExport(buildExport([record("new")])));
    fireEvent.click(await screen.findByRole("button", { name: "취소" }));
    expect(ids()).toEqual([]);
  });

  it("explains a broken or foreign file in plain words and saves nothing", async () => {
    openRecords();
    pick("{ not json");
    expect((await screen.findByRole("alert")).textContent).toMatch(/파일을 읽을 수 없습니다/);
    pick(JSON.stringify({ format: "something-else" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/감정 관찰실에서 내보낸 기록 파일이 아닙니다/));
    expect(ids()).toEqual([]);
  });

  it("refuses a file over the size limit before reading it", () => {
    openRecords();
    pick("{}", MAX_IMPORT_BYTES + 1);
    expect(screen.getByRole("alert").textContent).toMatch(/5MB/);
  });

  it("deletes everything only after one confirmation that says it cannot be undone", () => {
    seed([record("a")]);
    storage.saveDraft({ ...record("d"), status: "draft" });
    openRecords();
    fireEvent.click(screen.getByRole("button", { name: "이 기기의 기록 모두 지우기" }));
    expect(ids()).toEqual(["a"]);
    expect(document.body.textContent).toMatch(/되돌릴 수 없습니다/);
    expect(document.body.textContent).toMatch(/파일로 내보내기」로 파일을 받아 둘 수 있습니다/);
    fireEvent.click(screen.getByRole("button", { name: "모두 지우기" }));
    expect(ids()).toEqual([]);
    expect(storage.loadDraft()).toBeNull();
    expect(screen.getByText("아직 남긴 기록이 없습니다.")).toBeTruthy();
  });
});
