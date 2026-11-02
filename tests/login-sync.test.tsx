import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { getAccountState, mergeRecords, recordSaved, resumeAccount, setClientFactoryForTests, setIterationsForTests, type RemoteRow, type SupabaseLike } from "../lib/account";
import { ko, koOnly } from "../lib/i18n/messages.ko";
import type { EmotionSession } from "../lib/session-types";
import { getStorageAdapter } from "../lib/storage-adapter";
import { createVault, lastTouched, lockRecord, openVault, unlockRecord } from "../lib/vault-crypto";

/**
 * Login and synced locked records (owner's decision 2026-11-02, preview only).
 * A fake Supabase client stands in for the server and keeps every value the app
 * hands it, so the tests can look at exactly what would leave the device.
 */
const copy = koOnly.account;
const FAST = 1000;
const PASS = "my record passphrase";
const MEMO = "친구와 통화했다";
const WORD = "긴장";

const record = (id: string, at = "2026-10-01T09:04:00.000Z"): EmotionSession => ({
  id, createdAt: "2026-10-01T09:00:00.000Z", completedAt: at, status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.3, activation: 0.6 }, candidatePool: [{ label: WORD, source: "suggested" }], selected: [{ label: WORD, source: "suggested" }] },
  deepReflection: { startedAt: "2026-10-01T09:00:00.000Z", body: [], concerns: [], emotionCandidates: [], context: { eventText: MEMO, source: "event" } },
});

type Fake = { client: SupabaseLike; sent: { what: string; value: unknown }[]; db: { vault: object | null; records: RemoteRow[] } };
const makeFake = (): Fake => {
  const sent: Fake["sent"] = [];
  const db: Fake["db"] = { vault: null, records: [] };
  const user = { id: "00000000-0000-4000-8000-000000000001", email: "me@example.com" };
  let session: { user: typeof user } | null = null;
  const log = (what: string, value: unknown) => { sent.push({ what, value }); };
  const client = {
    auth: {
      signInWithOtp: async (args: unknown) => { log("otp", args); return { error: null }; },
      verifyOtp: async (args: { token: string }) => {
        log("verify", args);
        if (args.token !== "123456") return { data: null, error: { code: "otp_expired", status: 403 } };
        session = { user };
        return { data: { user }, error: null };
      },
      getSession: async () => ({ data: { session }, error: null }),
      setSession: async (tokens: { access_token: string; refresh_token: string }) => {
        log("setSession", "tokens");
        if (tokens.access_token !== "link-access") return { data: { session: null }, error: { code: "bad_jwt" } };
        session = { user };
        return { data: { session }, error: null };
      },
      signOut: async (args: unknown) => { log("signOut", args); session = null; return { error: null }; },
    },
    from: (table: "vault" | "records") => ({
      select: (columns: string) => {
        log(`select:${table}`, columns);
        return Object.assign(Promise.resolve({ data: table === "records" ? db.records : db.vault ? [db.vault] : [], error: null }), {
          maybeSingle: () => Promise.resolve({ data: db.vault, error: null }),
        });
      },
      insert: async (row: object) => { log(`insert:${table}`, row); db.vault = row; return { error: null }; },
      upsert: async (rows: RemoteRow[]) => {
        log(`upsert:${table}`, rows);
        for (const row of rows) db.records = [...db.records.filter((item) => item.id !== row.id), row];
        return { error: null };
      },
    }),
    rpc: async (name: string) => { log("rpc", name); db.vault = null; db.records = []; session = null; return { error: null }; },
  };
  return { client: client as unknown as SupabaseLike, sent, db };
};

const loginOn = () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
};
const openRecords = () => { render(<Home />); fireEvent.click(screen.getByRole("button", { name: ko.landing.records })); };
const panel = () => screen.getByRole("region", { name: copy.title });
const type = (label: string | RegExp, value: string) => fireEvent.change(within(panel()).getByLabelText(label), { target: { value } });
const press = (name: string) => fireEvent.click(within(panel()).getByRole("button", { name }));
const storedText = () => [window.localStorage, window.sessionStorage].map((store) => Object.keys(store).map((key) => `${key}=${store.getItem(key)}`).join("\n")).join("\n");

/** Consent, email, code, then a new 기록 암호: the first device. */
const signInFirstTime = async () => {
  openRecords();
  press(copy.open);
  fireEvent.click(within(panel()).getByLabelText(copy.consentAccount));
  fireEvent.click(within(panel()).getByLabelText(copy.consentRecords));
  type(copy.emailLabel, "me@example.com");
  press(copy.sendCode);
  await within(panel()).findByLabelText(copy.codeLabel);
  type(copy.codeLabel, "123456");
  press(copy.verify);
  await within(panel()).findByLabelText(copy.passphrase);
  type(copy.passphrase, PASS);
  type(copy.passphraseAgain, PASS);
  press(copy.setConfirm);
  await waitFor(() => expect(getAccountState().phase).toBe("unlocked"));
};

let fake: Fake;
let factory: ReturnType<typeof vi.fn<() => Promise<SupabaseLike>>>;
let fetchSpy: { mockRestore(): void };
let fetchCalls: () => number;
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  fake = makeFake();
  factory = vi.fn<() => Promise<SupabaseLike>>(async () => fake.client);
  const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in tests"));
  fetchSpy = spy;
  fetchCalls = () => spy.mock.calls.length;
  setIterationsForTests(FAST);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  fetchSpy.mockRestore();
  setIterationsForTests(null);
  setClientFactoryForTests(factory);
});

describe("without the login values", () => {
  it("draws no login entry, loads no client and makes no request in the guest flow", async () => {
    setClientFactoryForTests(factory);
    getStorageAdapter().saveCompleted(record("11111111-1111-4111-8111-111111111111"));
    openRecords();
    expect(screen.queryByText(copy.open)).toBeNull();
    expect(screen.queryByRole("region", { name: copy.title })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: ko.records.backToStart }));
    await act(async () => { await resumeAccount(); });
    expect(getAccountState().phase).toBe("off");
    expect(factory).not.toHaveBeenCalled();
    expect(fetchCalls()).toBe(0);
  });
});

describe("with the login values, a guest who never opens it", () => {
  it("sees the entry but sends nothing and loads no client", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    getStorageAdapter().saveCompleted(record("11111111-1111-4111-8111-111111111111"));
    openRecords();
    expect(within(panel()).getByRole("button", { name: copy.open })).toBeTruthy();
    recordSaved(record("22222222-2222-4222-8222-222222222222"));
    await act(async () => { await resumeAccount(); });
    expect(factory).not.toHaveBeenCalled();
    expect(fetchCalls()).toBe(0);
  });

  it("is not on the English screen", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    const { default: EmotionApp } = await import("../app/emotion-app");
    render(<EmotionApp locale="en" />);
    fireEvent.click(screen.getAllByRole("button").find((button) => button.classList.contains("records-link"))!);
    expect(screen.queryByText(copy.open)).toBeNull();
  });
});

describe("the two agreements", () => {
  it("must both be ticked before an email can be sent", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    type(copy.emailLabel, "me@example.com");
    const send = within(panel()).getByRole("button", { name: copy.sendCode });
    expect(send).toBeDisabled();
    fireEvent.click(send);
    fireEvent.click(within(panel()).getByLabelText(copy.consentAccount));
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(fake.sent).toEqual([]);
    fireEvent.click(within(panel()).getByLabelText(copy.consentRecords));
    expect(send).toBeEnabled();
    fireEvent.click(send);
    await waitFor(() => expect(fake.sent.map((item) => item.what)).toEqual(["otp"]));
  });

  it("are Aside's draft wording, shown in full", () => {
    loginOn();
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    const text = panel().textContent!;
    for (const line of [copy.consentLead, ...copy.consentPoints, copy.consentAccount, copy.consentRecords, copy.continueAsGuest]) expect(text).toContain(line);
    expect(copy.consentPoints).toContain("서버는 Supabase(미국 회사)이고, 서울에 있어요.");
  });

  it("a wrong code reads as wrong or expired, and a short one is caught before sending", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    fireEvent.click(within(panel()).getByLabelText(copy.consentAccount));
    fireEvent.click(within(panel()).getByLabelText(copy.consentRecords));
    type(copy.emailLabel, "me@example.com");
    press(copy.sendCode);
    await within(panel()).findByLabelText(copy.codeLabel);
    type(copy.codeLabel, "123");
    press(copy.verify);
    expect(await within(panel()).findByText(copy.notes["code-format"])).toBeTruthy();
    type(copy.codeLabel, "654321");
    press(copy.verify);
    expect(await within(panel()).findByText(copy.notes["code-wrong-or-expired"])).toBeTruthy();
  });
});

describe("coming back signed in", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("from the email link, goes straight to 다른 기기에서도 보기 with its title focused, and wipes the link from the address", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    window.history.replaceState(null, "", "/#access_token=link-access&refresh_token=link-refresh&type=magiclink");
    render(<Home />);
    expect(await within(panel()).findByText(copy.arrivedSet)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.records.title);
    await waitFor(() => expect(document.activeElement).toBe(within(panel()).getByText(copy.title)));
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toMatch(/link-access|link-refresh/);
    expect(within(panel()).getByLabelText(copy.passphrase)).toBeTruthy();
  });

  it("from the email link to an account that already has a 기록 암호, asks for it", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    fake.db.vault = (await createVault(PASS, FAST)).row;
    window.history.replaceState(null, "", "/#access_token=link-access&refresh_token=link-refresh&type=magiclink");
    render(<Home />);
    expect(await within(panel()).findByText(copy.arrivedUnlock)).toBeTruthy();
    expect(within(panel()).getByLabelText(copy.unlockLabel)).toBeTruthy();
  });

  it("from a link that no longer works, says so on the same spot", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    window.history.replaceState(null, "", "/#access_token=old&refresh_token=old&type=magiclink");
    render(<Home />);
    expect(await within(panel()).findByText(copy.notes["link-expired"])).toBeTruthy();
    expect(window.location.hash).toBe("");
  });

  it("by code, shows the same first line", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    fireEvent.click(within(panel()).getByLabelText(copy.consentAccount));
    fireEvent.click(within(panel()).getByLabelText(copy.consentRecords));
    type(copy.emailLabel, "me@example.com");
    press(copy.sendCode);
    await within(panel()).findByLabelText(copy.codeLabel);
    type(copy.codeLabel, "123456");
    press(copy.verify);
    expect(await within(panel()).findByText(copy.arrivedSet)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(within(panel()).getByText(copy.title)));
  });
});

describe("locking with the 기록 암호", () => {
  it("round-trips a record, and a wrong 기록 암호 is refused", async () => {
    const { row, key } = await createVault(PASS, FAST);
    const blob = await lockRecord(key, record("a"));
    expect(blob).not.toContain(MEMO);
    expect(blob).not.toContain(WORD);
    expect((await unlockRecord(key, blob))?.deepReflection?.context?.eventText).toBe(MEMO);
    expect(await openVault(row, "not my passphrase")).toEqual({ ok: false, error: "wrong-passphrase" });
    const opened = await openVault(row, PASS);
    expect(opened.ok).toBe(true);
    expect((await unlockRecord((opened as { ok: true; key: CryptoKey }).key, blob))?.id).toBe("a");
  });

  it("seals every record with a fresh iv", async () => {
    const { key } = await createVault(PASS, FAST);
    const [one, two] = [await lockRecord(key, record("a")), await lockRecord(key, record("a"))];
    expect(JSON.parse(one).iv).not.toBe(JSON.parse(two).iv);
  });

  it("asks for at least eight characters, typed the same twice, and says in bold that a lost one cannot be recovered", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    fireEvent.click(within(panel()).getByLabelText(copy.consentAccount));
    fireEvent.click(within(panel()).getByLabelText(copy.consentRecords));
    type(copy.emailLabel, "me@example.com");
    press(copy.sendCode);
    await within(panel()).findByLabelText(copy.codeLabel);
    type(copy.codeLabel, "123456");
    press(copy.verify);
    await within(panel()).findByLabelText(copy.passphrase);
    expect(within(panel()).getByText(copy.forgetWarning).tagName).toBe("STRONG");
    type(copy.passphrase, "short");
    type(copy.passphraseAgain, "short");
    press(copy.setConfirm);
    expect(await within(panel()).findByText(copy.notes["passphrase-short"])).toBeTruthy();
    type(copy.passphrase, PASS);
    type(copy.passphraseAgain, `${PASS}!`);
    press(copy.setConfirm);
    expect(await within(panel()).findByText(copy.notes["passphrase-mismatch"])).toBeTruthy();
    expect(fake.sent.some((item) => item.what === "insert:vault")).toBe(false);
  });
});

describe("로그아웃 on the 기록 암호 steps", () => {
  const toPassphraseStep = async () => {
    openRecords();
    press(copy.open);
    fireEvent.click(within(panel()).getByLabelText(copy.consentAccount));
    fireEvent.click(within(panel()).getByLabelText(copy.consentRecords));
    type(copy.emailLabel, "me@example.com");
    press(copy.sendCode);
    await within(panel()).findByLabelText(copy.codeLabel);
    type(copy.codeLabel, "123456");
    press(copy.verify);
  };

  it("is not on the confirm button's line, and asks once before a 기록 암호 is set", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    await toPassphraseStep();
    await within(panel()).findByLabelText(copy.passphrase);
    const confirm = within(panel()).getByRole("button", { name: copy.setConfirm });
    const signOutButton = within(panel()).getByRole("button", { name: copy.signOut });
    expect(confirm.parentElement).not.toBe(signOutButton.parentElement);
    expect(confirm.parentElement!.contains(signOutButton)).toBe(false);
    // it comes after everything else in the section
    expect(confirm.compareDocumentPosition(signOutButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(signOutButton);
    expect(fake.sent.some((item) => item.what === "signOut")).toBe(false);
    const ask = within(panel()).getByRole("group", { name: copy.signOutConfirmTitle });
    fireEvent.click(within(ask).getByRole("button", { name: copy.signOutCancel }));
    expect(getAccountState().phase).toBe("locked");
    expect(fake.sent.some((item) => item.what === "signOut")).toBe(false);

    fireEvent.click(within(panel()).getByRole("button", { name: copy.signOut }));
    fireEvent.click(within(within(panel()).getByRole("group", { name: copy.signOutConfirmTitle })).getByRole("button", { name: copy.signOutConfirm }));
    await waitFor(() => expect(getAccountState().phase).toBe("signed-out"));
    expect(fake.sent.filter((item) => item.what === "signOut")).toHaveLength(1);
  });

  it("on another device, is apart from 열기 too", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    fake.db.vault = (await createVault(PASS, FAST)).row;
    await toPassphraseStep();
    await within(panel()).findByLabelText(copy.unlockLabel);
    const confirm = within(panel()).getByRole("button", { name: copy.unlockConfirm });
    const signOutButton = within(panel()).getByRole("button", { name: copy.signOut });
    expect(confirm.parentElement).not.toBe(signOutButton.parentElement);
    expect(confirm.parentElement!.contains(signOutButton)).toBe(false);
  });
});

describe("what reaches the server", () => {
  it("holds none of the record's words, and neither the 기록 암호 nor the key is left in storage", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    getStorageAdapter().saveCompleted(record("11111111-1111-4111-8111-111111111111"));
    await signInFirstTime();
    expect(await within(panel()).findByText(copy.importQuestion.replace("{count}", "1"))).toBeTruthy();
    press(copy.importConfirm);
    await waitFor(() => expect(fake.db.records).toHaveLength(1));
    recordSaved(record("22222222-2222-4222-8222-222222222222"));
    await waitFor(() => expect(fake.db.records).toHaveLength(2));

    const everything = JSON.stringify(fake.sent);
    for (const secret of [MEMO, WORD, PASS, "quick-summary", "valence"]) expect(everything, secret).not.toContain(secret);
    expect(fake.db.records.map((row) => Object.keys(row).sort())).toEqual([["blob", "id", "updated_at"], ["blob", "id", "updated_at"]]);
    expect(Object.keys(fake.db.vault!).sort()).toEqual(["check_blob", "kdf"]);

    const stored = storedText();
    expect(stored).not.toContain(PASS);
    expect(stored).not.toMatch(/CryptoKey|check_blob|"kdf"/);
  });

  it("asks before taking this device's records, and sends none of them after 「이 기기에만 두기」", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    const here = record("11111111-1111-4111-8111-111111111111");
    getStorageAdapter().saveCompleted(here);
    await signInFirstTime();
    expect(fake.sent.some((item) => item.what === "upsert:records")).toBe(false);
    press(copy.importKeep);
    expect(within(panel()).queryByText(copy.importQuestion.replace("{count}", "1"))).toBeNull();
    recordSaved({ ...here, labelsLater: [{ label: "서운함", at: "2026-10-02T09:00:00.000Z" }] });
    await act(async () => { await Promise.resolve(); });
    expect(fake.sent.some((item) => item.what === "upsert:records")).toBe(false);
    expect(getStorageAdapter().loadCompleted().map((session) => session.id)).toEqual([here.id]);

    // the answer is remembered: unlocking again does not ask a second time
    setClientFactoryForTests(factory);
    window.localStorage.setItem("sb-example-auth-token", "{}");
    await act(async () => { await resumeAccount(); });
    expect(getAccountState().phase).toBe("locked");
    cleanup();
    openRecords();
    type(copy.unlockLabel, PASS);
    press(copy.unlockConfirm);
    await waitFor(() => expect(getAccountState().phase).toBe("unlocked"));
    expect(getAccountState().askImport).toEqual([]);
  });

  it("opens on another device with the same 기록 암호, refuses a wrong one, and never touches this device's records", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    const first = record("11111111-1111-4111-8111-111111111111");
    getStorageAdapter().saveCompleted(first);
    await signInFirstTime();
    press(copy.importConfirm);
    await waitFor(() => expect(fake.db.records).toHaveLength(1));
    cleanup();

    // another device: an empty browser, the same account, the page reloaded
    window.localStorage.clear();
    setClientFactoryForTests(factory);
    window.localStorage.setItem("sb-example-auth-token", "{}");
    await act(async () => { await resumeAccount(); });
    openRecords();
    type(copy.unlockLabel, "not my passphrase");
    press(copy.unlockConfirm);
    expect(await within(panel()).findByText(copy.notes["passphrase-wrong"])).toBeTruthy();
    type(copy.unlockLabel, PASS);
    press(copy.unlockConfirm);
    await waitFor(() => expect(getAccountState().phase).toBe("unlocked"));
    expect(getAccountState().remote.map((item) => item.session.deepReflection?.context?.eventText)).toEqual([MEMO]);
    // shown in the list, but not written into this browser's storage
    expect(getStorageAdapter().loadCompleted()).toEqual([]);
    expect(storedText()).not.toContain(MEMO);
  });

  it("deletes the account after asking once, and keeps this device's records", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    const here = record("11111111-1111-4111-8111-111111111111");
    getStorageAdapter().saveCompleted(here);
    await signInFirstTime();
    press(copy.importConfirm);
    await waitFor(() => expect(fake.db.records).toHaveLength(1));
    press(copy.deleteAccount);
    expect(fake.sent.some((item) => item.what === "rpc")).toBe(false);
    expect(within(panel()).getByText(copy.deleteConfirmBody)).toBeTruthy();
    fireEvent.click(within(within(panel()).getByRole("group", { name: copy.deleteConfirmTitle })).getByRole("button", { name: copy.deleteConfirm }));
    expect(await within(panel()).findByText(copy.notes.deleted)).toBeTruthy();
    expect(fake.sent.filter((item) => item.what === "rpc").map((item) => item.value)).toEqual(["delete_my_account"]);
    expect(getStorageAdapter().loadCompleted().map((session) => session.id)).toEqual([here.id]);
    expect(getAccountState().remote).toEqual([]);
  });
});

describe("joining the two lists", () => {
  it("keeps this device's list as it is when the account has nothing", () => {
    const local = [record("a")];
    expect(mergeRecords(local, [])).toBe(local);
  });

  it("joins by id and shows the newer copy", () => {
    const older = record("a", "2026-10-01T09:04:00.000Z");
    const newer = { ...record("a", "2026-10-01T09:04:00.000Z"), labelsLater: [{ label: "서운함", at: "2026-10-03T09:00:00.000Z" }] };
    expect(mergeRecords([older], [{ session: newer, updatedAt: "2026-10-03T09:00:00+00:00" }])[0]).toBe(newer);
    expect(mergeRecords([newer], [{ session: older, updatedAt: lastTouched(older) }])[0]).toBe(newer);
    expect(mergeRecords([record("a")], [{ session: record("b"), updatedAt: lastTouched(record("b")) }]).map((session) => session.id).sort()).toEqual(["a", "b"]);
  });
});
