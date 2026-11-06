import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageAdapter } from "../lib/storage-adapter";
import { createSession, sessionReducer, type EmotionSession } from "../lib/session-types";
import { buildExport, parseImport, serializeExport } from "../lib/record-transfer";
import { migrateV2Session, migrateV3Session } from "../lib/migrations";
import { INPUT_LIMITS } from "../lib/limits";
import { startQuick } from "./helpers/start";

/**
 * 무슨 일이 있었나요 on the quick look (owner's decision 2026-10-30, second round A):
 * one optional line under the second step, kept in quickCheck.context.eventText.
 */
const toSecondStep = () => {
  render(<Home />);
  startQuick();
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
};
const field = () => screen.getByLabelText(new RegExp(`^${ko.quickCandidates.context.label}`)) as HTMLInputElement;

describe("what happened, on the quick look", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("is one single-line field above 여기까지, with the given title and hint, and no source choice", () => {
    toSecondStep();
    const input = field();
    expect(input.tagName).toBe("INPUT");
    expect(input.maxLength).toBe(INPUT_LIMITS.text);
    expect(screen.getByText(ko.quickCandidates.context.hint)).toBeInTheDocument();
    const finish = screen.getByRole("button", { name: ko.quickCandidates.finish });
    expect(input.compareDocumentPosition(finish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the slower look's 사건 · 기억 · 예상 · 생각 is not brought here
    expect(screen.queryByText(ko.context.sourceQuestion)).toBeNull();
    expect(document.querySelectorAll(".quick-context input, .quick-context textarea")).toHaveLength(1);
  });

  it("can be left empty: the record is saved without the field", () => {
    toSecondStep();
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.finish }));
    const [saved] = getStorageAdapter().loadCompleted();
    expect(saved.quickCheck).not.toHaveProperty("context");
  });

  it("is saved with the record and shown back as 그때 일어난 일, marked as written by the person", () => {
    toSecondStep();
    fireEvent.change(field(), { target: { value: "  회의에서 내 안이 빠졌다  " } });
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.finish }));
    const [saved] = getStorageAdapter().loadCompleted();
    expect(saved.quickCheck?.context).toEqual({ eventText: "회의에서 내 안이 빠졌다" });
    cleanup();

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row")!);
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.sourcesShow })); // the source labels are folded by default (2026-11-05)
    const row = [...document.querySelectorAll(".summary-row")].find((item) => item.textContent?.includes(ko.recordDetail.quickContext))!;
    expect(row.textContent).toContain("회의에서 내 안이 빠졌다");
    expect(row.className).toContain("source-mine");
    expect(row.textContent).toContain(ko.recordDetail.source.wrote);
  });

  it("shows no 그때 일어난 일 row on a record that has none", () => {
    toSecondStep();
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.finish }));
    cleanup();
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row")!);
    expect(document.body.textContent).not.toContain(ko.recordDetail.quickContext);
  });
});

describe("SET_QUICK_CONTEXT", () => {
  const open = (): EmotionSession => {
    const started = sessionReducer(createSession(), { type: "START_QUICK" });
    return sessionReducer(started, { type: "SET_QUICK_AFFECT", affect: { valence: 0.5, activation: 0.5 } });
  };

  it("trims, caps at INPUT_LIMITS.text, and clears the field when emptied", () => {
    let session = sessionReducer(open(), { type: "SET_QUICK_CONTEXT", eventText: "가".repeat(INPUT_LIMITS.text + 50) });
    expect(session.quickCheck?.context?.eventText).toHaveLength(INPUT_LIMITS.text);
    session = sessionReducer(session, { type: "SET_QUICK_CONTEXT", eventText: "   " });
    expect(session.quickCheck?.context).toBeUndefined();
  });

  it("is not a step, so 이전 단계 does not walk back through typing", () => {
    const before = open();
    const after = sessionReducer(before, { type: "SET_QUICK_CONTEXT", eventText: "일" });
    expect(after.history).toEqual(before.history);
    expect(after.stage).toBe(before.stage);
  });

  it("does not touch a quick look that has ended: the moment's layer stays fixed", () => {
    const done = sessionReducer(sessionReducer(open(), { type: "SET_QUICK_CONTEXT", eventText: "처음" }), { type: "COMPLETE_QUICK" });
    expect(sessionReducer(done, { type: "SET_QUICK_CONTEXT", eventText: "나중" })).toBe(done);
    const reopened = sessionReducer(done, { type: "ENTER_DEEP" });
    expect(sessionReducer(reopened, { type: "SET_QUICK_CONTEXT", eventText: "나중" })).toBe(reopened);
  });

  it("leaves the slower look's own context separate", () => {
    const session = sessionReducer(open(), { type: "SET_QUICK_CONTEXT", eventText: "빠른 쪽" });
    expect(session.deepReflection).toBeUndefined();
  });
});

describe("carrying it over", () => {
  const record = (quick: Record<string, unknown>): EmotionSession => ({
    id: "r1", createdAt: "2026-10-30T01:00:00.000Z", completedAt: "2026-10-30T01:01:00.000Z", status: "completed", stage: "quick-summary", entry: "quick",
    quickCheck: { candidatePool: [], selected: [], ...quick },
  } as EmotionSession);

  it("keeps the line through export and import", () => {
    const parsed = parseImport(serializeExport(buildExport([record({ context: { eventText: "버스를 놓쳤다" } })])));
    expect(parsed.ok && parsed.records[0].quickCheck?.context).toEqual({ eventText: "버스를 놓쳤다" });
  });

  it("still opens a record saved before the field existed", () => {
    const parsed = parseImport(serializeExport(buildExport([record({})])));
    expect(parsed.ok && parsed.records).toHaveLength(1);
  });

  it("refuses a file whose line is not text", () => {
    const parsed = parseImport(serializeExport(buildExport([record({ context: { eventText: 3 } })])));
    expect(parsed.ok && parsed.invalid).toBe(1);
  });

  it("passes through the storage migrations unchanged", () => {
    const old = record({ context: { eventText: "옛 기록" } });
    expect(migrateV3Session(migrateV2Session(old as never)).quickCheck?.context).toEqual({ eventText: "옛 기록" });
  });
});

describe("English wording", () => {
  it("has its own title and hint for the line", () => {
    expect(en.quickCandidates.context.label).toBe("What happened");
    expect(en.quickCandidates.context.hint.length).toBeGreaterThan(0);
    expect(en.recordDetail.quickContext.length).toBeGreaterThan(0);
  });
});
