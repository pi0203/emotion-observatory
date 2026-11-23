import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { hasLegacyStorage, migrateLegacyStorage } from "../lib/migrations";
import { createSession } from "../lib/session-types";
import { clearAllRecords, dropCompleted, loadCompleted, loadDraft, persistSession, removeDraft } from "../lib/storage";

/**
 * A browser with site data blocked altogether throws on the first touch of
 * window.localStorage, before any value is read (2026-11-20). Reading and removing used to
 * sit outside a try, so the first screen could fail to open. Now nothing here throws: reads
 * give the empty answer, writes report false, and the steps show the note they already had.
 */
describe("when the browser blocks storage altogether", () => {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("The operation is insecure.", "SecurityError"); } });
  });
  afterEach(() => {
    cleanup();
    if (original) Object.defineProperty(window, "localStorage", original);
    else delete (window as unknown as { localStorage?: Storage }).localStorage;
  });

  it("the storage really is blocked in this test", () => {
    expect(() => window.localStorage).toThrow();
  });

  it("reads give the empty answer and removals do nothing, without throwing", async () => {
    expect(loadDraft()).toBeNull();
    expect(loadCompleted()).toEqual([]);
    expect(() => removeDraft()).not.toThrow();
    expect(() => dropCompleted("none")).not.toThrow();
    await expect(clearAllRecords()).resolves.toBeUndefined();
    expect(persistSession({ ...createSession(), status: "completed" })).toBe(false);
    expect(persistSession(createSession())).toBe(false);
  });

  it("the older stores are left alone without throwing", () => {
    expect(hasLegacyStorage()).toBe(false);
    expect(migrateLegacyStorage()).toBe(0);
  });

  it("the first screen opens, and a step says the record is not being kept", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.common.appName);
    expect(screen.queryByText(ko.common.saveFailed)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.landing.start}`) }));
    // the note the app already had for a refused write (role="status"), no new sentence
    expect(screen.getByRole("status").textContent).toBe(ko.common.saveFailed);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.quickAffect.title);
  });
});

describe("when the browser refuses only the write that brings older records over", () => {
  afterEach(() => window.localStorage.clear());

  it("nothing is thrown and the older records stay where they were for the next open", () => {
    window.localStorage.clear();
    const old = JSON.stringify([{ id: "old-1", createdAt: "2026-01-01T00:00:00.000Z", status: "completed", stage: "summary" }]);
    window.localStorage.setItem("emotion-lab:completed:v3", old);
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError"); };
    try {
      expect(migrateLegacyStorage()).toBe(0);
    } finally {
      Storage.prototype.setItem = setItem;
    }
    expect(window.localStorage.getItem("emotion-lab:completed:v3")).toBe(old);
  });
});
