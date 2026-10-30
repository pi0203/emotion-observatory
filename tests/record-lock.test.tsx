import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { buildExport, parseImport } from "../lib/record-transfer";
import { isLockedText, KDF_ITERATIONS, LOCKED_FORMAT, lockedFileName, lockExport, unlockExport } from "../lib/record-crypto";
import type { EmotionSession } from "../lib/session-types";
import { getStorageKeys } from "../lib/storage";
import { getStorageAdapter } from "../lib/storage-adapter";
import { ko } from "../lib/i18n/messages.ko";

// a small iteration count keeps the tests fast; the app uses KDF_ITERATIONS
const FAST = 1000;
const record = (id: string): EmotionSession => ({
  id, createdAt: "2026-10-01T09:00:00.000Z", completedAt: "2026-10-01T09:04:00.000Z", status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.3, activation: 0.6 }, candidatePool: [{ label: "긴장", source: "suggested" }], selected: [{ label: "긴장", source: "suggested" }] },
  deepReflection: { startedAt: "2026-10-01T09:00:00.000Z", body: [], concerns: [], emotionCandidates: [], context: { eventText: "친구와 통화했다", source: "event" } },
});

describe("locking an exported file", () => {
  it("uses at least OWASP's iteration count in the app", () => {
    expect(KDF_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  it("round-trips with the right passphrase, and the locked file shows none of the words", async () => {
    const file = buildExport([record("a")]);
    const locked = await lockExport(file, "correct horse", FAST);
    const text = JSON.stringify(locked);
    expect(locked.format).toBe(LOCKED_FORMAT);
    expect(text).not.toMatch(/친구와 통화했다|긴장|emotion-observatory-records"/);
    expect(isLockedText(text)).toBe(true);
    const opened = await unlockExport(text, "correct horse");
    expect(opened.ok).toBe(true);
    const parsed = parseImport((opened as { ok: true; text: string }).text);
    expect(parsed.ok && parsed.records.map((session) => session.id)).toEqual(["a"]);
  });

  it("refuses a wrong passphrase and a tampered file the same way", async () => {
    const text = JSON.stringify(await lockExport(buildExport([record("a")]), "correct horse", FAST));
    expect(await unlockExport(text, "wrong horse")).toEqual({ ok: false, error: "wrong-passphrase" });
    const tampered = JSON.parse(text);
    tampered.data = tampered.data.slice(0, -4) + (tampered.data.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await unlockExport(JSON.stringify(tampered), "correct horse")).toEqual({ ok: false, error: "wrong-passphrase" });
  });

  it("tells a damaged or newer file apart", async () => {
    const good = await lockExport(buildExport([record("a")]), "correct horse", FAST);
    expect(await unlockExport(JSON.stringify({ ...good, formatVersion: 2 }), "correct horse")).toEqual({ ok: false, error: "unsupported-version" });
    expect(await unlockExport(JSON.stringify({ ...good, kdf: { ...good.kdf, iterations: "many" } }), "correct horse")).toEqual({ ok: false, error: "damaged" });
    expect(await unlockExport("{ not json", "x")).toEqual({ ok: false, error: "damaged" });
    expect(isLockedText(JSON.stringify(buildExport([record("a")])))).toBe(false);
  });

  it("uses a fresh salt and nonce every time", async () => {
    const file = buildExport([record("a")]);
    const one = await lockExport(file, "correct horse", FAST);
    const two = await lockExport(file, "correct horse", FAST);
    expect(one.kdf.salt).not.toBe(two.kdf.salt);
    expect(one.cipher.iv).not.toBe(two.cipher.iv);
    expect(one.data).not.toBe(two.data);
    expect(lockedFileName("emotion-observatory-records-2026-10-19.json")).toBe("emotion-observatory-records-2026-10-19-locked.json");
  });
});

describe("records screen with a passphrase", () => {
  const storage = getStorageAdapter();
  beforeEach(() => { window.localStorage.clear(); window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([record("here")])); });
  afterEach(cleanup);
  const openRecords = () => { render(<Home />); fireEvent.click(screen.getByRole("button", { name: ko.landing.records })); };
  const pick = (contents: string) => fireEvent.change(screen.getByLabelText("가져올 기록 파일 고르기"), { target: { files: [new File([contents], "records.json", { type: "application/json" })] } });

  it("keeps the plain export when the fields are empty, and warns before a locked one", () => {
    openRecords();
    expect(screen.getByRole("button", { name: "파일로 내보내기" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("암호 (8자 이상)"), { target: { value: "short" } });
    expect(screen.getByRole("alert")).toHaveTextContent("암호는 8자 이상이어야 합니다.");
    expect(screen.getByRole("button", { name: "암호로 잠가 내보내기" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("암호 (8자 이상)"), { target: { value: "correct horse" } });
    fireEvent.change(screen.getByLabelText("암호 한 번 더"), { target: { value: "correct hors" } });
    expect(screen.getByRole("alert")).toHaveTextContent("두 번 적은 암호가 다릅니다.");
    fireEvent.change(screen.getByLabelText("암호 한 번 더"), { target: { value: "correct horse" } });
    expect(screen.getByText(/암호를 잊으면 이 파일은 누구도 열 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "암호로 잠가 내보내기" })).toBeEnabled();
  });

  it("asks for the passphrase of a locked file, refuses a wrong one, then imports with the right one", async () => {
    const text = JSON.stringify(await lockExport(buildExport([record("here"), record("new")]), "correct horse", FAST));
    openRecords();
    pick(text);
    const field = await screen.findByLabelText("파일 암호");
    fireEvent.change(field, { target: { value: "wrong horse" } });
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("암호가 맞지 않거나 파일이 손상되었습니다."));
    expect(storage.loadCompleted().map((session) => session.id)).toEqual(["here"]);
    fireEvent.change(screen.getByLabelText("파일 암호"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    await screen.findByText("이 파일에는 기록이 2개 있습니다. 그중 이미 이 기기에 있는 기록은 1개이고, 기록 모양이 아닌 항목은 0개입니다.");
    fireEvent.click(screen.getByRole("button", { name: "가져오기" }));
    expect(storage.loadCompleted().map((session) => session.id)).toEqual(["new", "here"]);
  });
});
