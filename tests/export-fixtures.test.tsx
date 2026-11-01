import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { applyImport, parseImport, planImport } from "../lib/record-transfer";
import { unlockExport } from "../lib/record-crypto";
import { getStorageAdapter } from "../lib/storage-adapter";
import { ko } from "../lib/i18n/messages.ko";

/**
 * The terms promise that a file exported before keeps importing, whatever
 * becomes of the format (이용약관 제10조 4, docs/TERMS.md). These two files were
 * exported on 2026-11-01 by the app's own buildExport and lockExport (format 1,
 * the app's iteration count), holding made-up entries only, the locked one
 * under a made-up passphrase. They are never written again: a change that
 * breaks them has to go on reading this format, not replace the files.
 */
const PLAIN = readFileSync("tests/fixtures/records-export-v1.json", "utf8");
const LOCKED = readFileSync("tests/fixtures/records-export-v1-locked.json", "utf8");
const PASSPHRASE = "fake-passphrase-for-tests";
const IDS = ["fixture-quick-ko", "fixture-deep-ko", "fixture-stopped-ko", "fixture-quick-en"];

const storage = getStorageAdapter();

describe("files exported on 2026-11-01", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("are read whole: every entry, none refused", () => {
    const parsed = parseImport(PLAIN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.records.map((record) => record.id)).toEqual(IDS);
    expect(parsed.invalid).toBe(0);
  });

  it("go onto an empty device in file order and open in 지난 기록", () => {
    const parsed = parseImport(PLAIN);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(applyImport(planImport(parsed, storage.loadCompleted()), storage)).toBe(IDS.length);
    expect(storage.loadCompleted().map((record) => record.id)).toEqual(IDS);
    render(<Home />);
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(`^${ko.landing.records}`) })[0]);
    const rows = document.querySelectorAll(".record-row");
    expect(rows).toHaveLength(IDS.length);
    // each entry opens without breaking, and shows the words it was given
    fireEvent.click(rows[1]);
    expect(document.body.textContent).toContain("가짜 기록: 친구와 통화했다");
  });

  it("open the locked one with its passphrase into the same entries", async () => {
    const opened = await unlockExport(LOCKED, PASSPHRASE);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(parseImport(opened.text)).toEqual(parseImport(PLAIN));
    expect(await unlockExport(LOCKED, "not-the-passphrase")).toEqual({ ok: false, error: "wrong-passphrase" });
  });

  it("hold made-up entries only", () => {
    const parsed = parseImport(PLAIN);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.records.every((record) => record.id.startsWith("fixture-"))).toBe(true);
    expect(PLAIN).toContain("가짜 기록");
  });
});
