import type { EmotionSession } from "./session-types";
import { getStorageAdapter } from "./storage-adapter";
import { supabaseConfig } from "./supabase-config";
import { createVault, lastTouched, lockRecord, MIN_PASSPHRASE_LENGTH, openVault, unlockRecord, type VaultRow } from "./vault-crypto";

/**
 * The opt-in account: email code login and records synced only after they are
 * locked on this device (owner's decision 2026-11-02, preview only).
 *
 * - Guest first. Nothing here runs, and no client is even loaded, unless the
 *   login values are set (lib/supabase-config.ts) and the person opens the
 *   login, already has a login stored in this browser, or comes back from the
 *   email's link. A guest's records never leave the device.
 * - The 기록 암호 and the key made from it are held in this module's memory
 *   only. Reloading the page forgets them, and the screen asks again.
 * - Records on this device are never deleted or overwritten by the account.
 *   Existing records go to the account only after 「가져오기」; that choice is
 *   remembered per account and not asked again.
 * - Records are merged by id; where both sides have one, the newer wins on
 *   screen. Drafts stay on the device; finished and stopped records sync.
 */

// ---------- the backend: the few Supabase calls this app makes ----------

export type AuthErrorKey = "email-invalid" | "email-not-allowed" | "rate-limit" | "code-format" | "code-wrong-or-expired" | "link-expired" | "network";
export type RemoteRow = { id: string; blob: string; updated_at: string };
/** A row as sent: with its owner, since a record's id is unique only within one account (0002_records_per_account.sql). */
type SentRow = RemoteRow & { user_id: string };
type Result<T> = { ok: true; value: T } | { ok: false; error: AuthErrorKey };

/** The subset of the Supabase client used here, so tests can hand in a fake one. */
export type SupabaseLike = {
  auth: {
    signInWithOtp(args: { email: string; options?: { shouldCreateUser?: boolean; emailRedirectTo?: string } }): Promise<{ error: unknown }>;
    verifyOtp(args: { email: string; token: string; type: "email" }): Promise<{ data: { user: { id: string; email?: string } | null } | null; error: unknown }>;
    getSession(): Promise<{ data: { session: { user: { id: string; email?: string } } | null }; error: unknown }>;
    setSession(tokens: { access_token: string; refresh_token: string }): Promise<{ data: { session: { user: { id: string; email?: string } } | null }; error: unknown }>;
    signOut(args?: { scope?: "global" | "local" | "others" }): Promise<{ error: unknown }>;
  };
  from(table: "vault" | "records"): {
    select(columns: string): PromiseLike<{ data: unknown; error: unknown }> & { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
    insert(row: object): PromiseLike<{ error: unknown }>;
    upsert(rows: object[], options?: { onConflict?: string }): PromiseLike<{ error: unknown }>;
  };
  rpc(name: "delete_my_account"): PromiseLike<{ error: unknown }>;
};

const authError = (error: unknown): AuthErrorKey => {
  const { code, status, message } = (error ?? {}) as { code?: string; status?: number; message?: string };
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429) return "rate-limit";
  if (code === "otp_expired" || code === "invalid_credentials") return "code-wrong-or-expired";
  if (code === "email_address_invalid" || code === "validation_failed") return "email-invalid";
  if (code === "email_address_not_authorized" || /not authorized/i.test(message ?? "")) return "email-not-allowed";
  return "network";
};

class BackendError extends Error {}
const check = (error: unknown) => { if (error) throw new BackendError(String((error as { message?: string }).message ?? error)); };

let clientFactory: () => Promise<SupabaseLike> = async () => {
  const config = supabaseConfig();
  if (!config) throw new BackendError("login is off");
  const { createClient } = await import("@supabase/supabase-js");
  // the email link is read by resumeAccount, not by the library: the library clears
  // the address with location.hash = "", a navigation Next.js did not make, and the
  // page lost its place (2026-11-02, the first link login landed on the first screen)
  return createClient(config.url, config.key, { auth: { detectSessionInUrl: false } }) as unknown as SupabaseLike;
};
let clientPromise: Promise<SupabaseLike> | null = null;
const client = () => (clientPromise ??= clientFactory());

/** Tests only: hand in a fake client and start from a clean state. */
export const setClientFactoryForTests = (factory: () => Promise<SupabaseLike>) => {
  clientFactory = factory;
  clientPromise = null;
  passphraseKey = null;
  setState(initialState());
};

// ---------- the state the screen draws ----------

export type AccountNote = AuthErrorKey | "passphrase-short" | "passphrase-mismatch" | "passphrase-wrong" | "vault-damaged" | "sync-failed" | "deleted" | "signed-out";

export type AccountState = {
  phase: "off" | "signed-out" | "code-sent" | "locked" | "unlocked";
  busy: boolean;
  email?: string;
  userId?: string;
  /** Only meaningful while locked: true when this account already has a 기록 암호. */
  hasVault?: boolean;
  /** True right after signing in by code or by the email link: the screen moves to the next step once, then clears it. */
  arrived?: boolean;
  /** The records in the account, unlocked, with when each last changed. Memory only. */
  remote: { session: EmotionSession; updatedAt: string }[];
  /** This device's records still waiting for the 「가져오기」 answer; empty when not asking. */
  askImport: string[];
  note?: AccountNote;
};

const initialState = (): AccountState => ({ phase: supabaseConfig() ? "signed-out" : "off", busy: false, remote: [], askImport: [] });

let state: AccountState = initialState();
const listeners = new Set<() => void>();
const setState = (patch: Partial<AccountState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};
export const getAccountState = () => state;
export const subscribeAccount = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

// the key from the 기록 암호: this variable, and nowhere else
let passphraseKey: CryptoKey | null = null;

const run = async (work: () => Promise<void>) => {
  setState({ busy: true, note: undefined });
  try {
    await work();
  } catch {
    setState({ note: "network" });
  } finally {
    setState({ busy: false });
  }
};

// ---------- the 가져오기 answer, remembered per account ----------

const CHOICE_KEY = "emotion-lab:account-import:v1";
type Choice = { choice: "imported" | "kept"; keptIds: string[] };
const readChoices = (): Record<string, Choice> => {
  try {
    return JSON.parse(window.localStorage.getItem(CHOICE_KEY) ?? "{}") as Record<string, Choice>;
  } catch {
    return {};
  }
};
const writeChoice = (userId: string, choice: Choice | null) => {
  const all = readChoices();
  if (choice) all[userId] = choice; else delete all[userId];
  try {
    window.localStorage.setItem(CHOICE_KEY, JSON.stringify(all));
  } catch {
    // storage refused: the question is asked again next time, nothing is sent meanwhile
  }
};

// ---------- the steps ----------

/** True when the address bar carries the email link's sign-in (or its error). */
export const isLinkReturn = () => typeof window !== "undefined" && /(?:^#|&)(?:access_token|error_description)=/.test(window.location.hash);

/**
 * Takes the link's values out of the address bar without a navigation. The
 * state passed is null on purpose: Next.js then treats it as an outside change
 * and updates its own idea of the address; given its own state back, it would
 * write the old address, tokens and all, at its next update. Called after an
 * await, so Next.js has finished setting up its history handling first.
 */
const clearLinkFromAddress = () => {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
};

const hasStoredLogin = () => {
  if (typeof window === "undefined") return false;
  try {
    return Object.keys(window.localStorage).some((key) => /^sb-.+-auth-token$/.test(key));
  } catch {
    return false;
  }
};

const signedIn = async (user: { id: string; email?: string }, arrived: boolean) => {
  const { data, error } = await (await client()).from("vault").select("kdf, check_blob").maybeSingle();
  check(error);
  setState({ phase: "locked", userId: user.id, email: user.email ?? state.email, hasVault: Boolean(data), arrived });
};

/** The screen has moved to the next step; do not move it again. */
export const clearArrived = () => { if (state.arrived) setState({ arrived: false }); };

/**
 * Picks up a login this browser already holds, or the one the email link
 * brought. Does nothing (and loads nothing) for a guest.
 */
export const resumeAccount = async () => {
  if (state.phase !== "signed-out") return;
  const link = isLinkReturn() ? new URLSearchParams(window.location.hash.slice(1)) : null;
  if (!link && !hasStoredLogin()) return;
  await run(async () => {
    const auth = (await client()).auth;
    if (link) clearLinkFromAddress();
    const access = link?.get("access_token");
    const refresh = link?.get("refresh_token");
    if (access && refresh) {
      const { data, error } = await auth.setSession({ access_token: access, refresh_token: refresh });
      if (!error && data.session) { await signedIn(data.session.user, true); return; }
    }
    const { data } = await auth.getSession();
    if (data.session) await signedIn(data.session.user, Boolean(link));
    else if (link) setState({ note: "link-expired" });
  });
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendCode = (email: string) => run(async () => {
  const address = email.trim();
  if (!EMAIL.test(address)) { setState({ note: "email-invalid" }); return; }
  const redirect = `${window.location.origin}${window.location.pathname}`;
  const { error } = await (await client()).auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: redirect } });
  if (error) { setState({ note: authError(error) }); return; }
  setState({ phase: "code-sent", email: address });
});

export const verifyCode = (code: string) => run(async () => {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) { setState({ note: "code-format" }); return; }
  const { data, error } = await (await client()).auth.verifyOtp({ email: state.email ?? "", token, type: "email" });
  if (error || !data?.user) { setState({ note: authError(error) }); return; }
  await signedIn(data.user, true);
});

/** Back from the code step to the email step. */
export const changeEmail = () => setState({ phase: "signed-out", note: undefined });

const unlocked = async (key: CryptoKey) => {
  passphraseKey = key;
  const { data, error } = await (await client()).from("records").select("id, blob, updated_at");
  check(error);
  const remote: AccountState["remote"] = [];
  for (const row of (data ?? []) as RemoteRow[]) {
    const session = await unlockRecord(key, row.blob);
    if (session) remote.push({ session, updatedAt: row.updated_at });
  }
  const userId = state.userId ?? "";
  const chosen = readChoices()[userId];
  const local = getStorageAdapter().loadCompleted();
  setState({ phase: "unlocked", remote, askImport: chosen ? [] : local.map((session) => session.id) });
};

/** First device: a new 기록 암호, typed twice, at least eight characters. */
export const setPassphrase = (passphrase: string, again: string) => run(async () => {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) { setState({ note: "passphrase-short" }); return; }
  if (passphrase !== again) { setState({ note: "passphrase-mismatch" }); return; }
  const { row, key } = await createVault(passphrase, iterationsForTests ?? undefined);
  const { error } = await (await client()).from("vault").insert(row);
  check(error);
  await unlocked(key);
});

/** Another device, or after a reload: the same 기록 암호 opens the same key. */
export const unlock = (passphrase: string) => run(async () => {
  const { data, error } = await (await client()).from("vault").select("kdf, check_blob").maybeSingle();
  check(error);
  if (!data) { setState({ hasVault: false }); return; }
  const result = await openVault(data as VaultRow, passphrase);
  if (!result.ok) { setState({ note: result.error === "damaged" ? "vault-damaged" : "passphrase-wrong" }); return; }
  await unlocked(result.key);
});

let iterationsForTests: number | null = null;
/** Tests only: a small PBKDF2 count so the suite stays fast. */
export const setIterationsForTests = (iterations: number | null) => { iterationsForTests = iterations; };

const upload = async (sessions: EmotionSession[]) => {
  const key = passphraseKey;
  if (!key || sessions.length === 0) return;
  const userId = state.userId;
  if (!key || !userId) return;
  const rows: SentRow[] = [];
  for (const session of sessions) rows.push({ user_id: userId, id: session.id, blob: await lockRecord(key, session), updated_at: lastTouched(session) });
  const { error } = await (await client()).from("records").upsert(rows, { onConflict: "user_id,id" });
  check(error);
  const sent = new Map(sessions.map((session) => [session.id, session]));
  setState({ remote: [...state.remote.filter((item) => !sent.has(item.session.id)), ...rows.map((row) => ({ session: sent.get(row.id)!, updatedAt: row.updated_at }))] });
};

const newer = (a: string, b: string) => Date.parse(a) > Date.parse(b);

/** 「가져오기」: this device's records go to the account, except where the account already holds a newer copy. */
export const importLocal = () => run(async () => {
  const waiting = new Set(state.askImport);
  const remote = new Map(state.remote.map((item) => [item.session.id, item.updatedAt]));
  const local = getStorageAdapter().loadCompleted().filter((session) => waiting.has(session.id));
  try {
    await upload(local.filter((session) => !remote.has(session.id) || newer(lastTouched(session), remote.get(session.id)!)));
  } catch {
    setState({ note: "sync-failed" });
    return;
  }
  writeChoice(state.userId ?? "", { choice: "imported", keptIds: [] });
  setState({ askImport: [] });
});

/** 「이 기기에만 두기」: these records stay here; they are not sent now or when saved later. */
export const keepLocal = () => {
  writeChoice(state.userId ?? "", { choice: "kept", keptIds: state.askImport });
  setState({ askImport: [] });
};

/**
 * Called after every save on this device. While signed in and unlocked, a
 * finished or stopped record is locked and sent; a draft, a record kept on
 * this device, or one still waiting for the 가져오기 answer is not.
 */
export const recordSaved = (session: EmotionSession) => {
  if (state.phase !== "unlocked" || !passphraseKey || session.status === "draft") return;
  if (state.askImport.includes(session.id)) return;
  if (readChoices()[state.userId ?? ""]?.keptIds.includes(session.id)) return;
  void upload([session]).catch(() => setState({ note: "sync-failed" }));
};

const forget = (note: AccountNote) => {
  passphraseKey = null;
  setState({ phase: "signed-out", email: undefined, userId: undefined, hasVault: undefined, arrived: false, remote: [], askImport: [], note });
};

export const signOut = () => run(async () => {
  await (await client()).auth.signOut({ scope: "local" });
  forget("signed-out");
});

/** Deletes the account and everything in it; the records on this device stay. */
export const deleteAccount = () => run(async () => {
  const userId = state.userId;
  const { error } = await (await client()).rpc("delete_my_account");
  check(error);
  await (await client()).auth.signOut({ scope: "local" });
  if (userId) writeChoice(userId, null);
  forget("deleted");
});

/**
 * The list the records screen shows: this device's records, joined by id with
 * the account's; where both hold one, the newer copy is shown. With no account
 * records it is this device's list itself, untouched.
 */
export const mergeRecords = (local: EmotionSession[], remote: AccountState["remote"]): EmotionSession[] => {
  if (remote.length === 0) return local;
  const byId = new Map(local.map((session) => [session.id, session]));
  for (const { session, updatedAt } of remote) {
    const here = byId.get(session.id);
    if (!here || newer(updatedAt, lastTouched(here))) byId.set(session.id, session);
  }
  return [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
};
