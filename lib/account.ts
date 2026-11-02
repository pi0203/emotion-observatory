import type { EmotionSession } from "./session-types";
import { getStorageAdapter } from "./storage-adapter";
import { OAUTH_PROVIDER, supabaseConfig, type LoginProvider } from "./supabase-config";

/**
 * The opt-in account: sign in, and the records follow to another device
 * (owner's decision 2026-11-02, changed the same day: no 기록 암호; preview only).
 *
 * - Guest first. Nothing here runs, and no client is even loaded, unless the
 *   login values are set (lib/supabase-config.ts) and the person opens the
 *   login, already has a login stored in this browser, or comes back from
 *   signing in. A guest's records never leave the device.
 * - Records are stored on the server as they are. Row level security lets each
 *   account read only its own rows; the maker can see them in Supabase's
 *   dashboard, and the consent says so.
 * - Records on this device are never deleted or overwritten by the account.
 *   Existing records go to the account only after 「가져오기」; that choice is
 *   remembered per account and not asked again.
 * - Records are merged by id; where both sides have one, the newer wins on
 *   screen. Drafts stay on the device; finished and stopped records sync.
 */

// ---------- the backend: the few Supabase calls this app makes ----------

export type AuthErrorKey = "email-invalid" | "email-not-allowed" | "rate-limit" | "code-format" | "code-wrong-or-expired" | "link-expired" | "login-failed" | "attempt-failed" | "provider-failed" | "network";
/** A record row as the server keeps it: one whole record in `data`. */
export type RemoteRow = { id: string; data: unknown; updated_at: string };
/** A row as sent: with its owner, since a record's id is unique only within one account (0002_records_per_account.sql). */
type SentRow = { user_id: string; id: string; data: EmotionSession; updated_at: string };

type User = { id: string; email?: string; app_metadata?: { provider?: string } };
type SessionResult = Promise<{ data: { session: { user: User } | null }; error: unknown }>;

/** The subset of the Supabase client used here, so tests can hand in a fake one. */
export type SupabaseLike = {
  auth: {
    signInWithOtp(args: { email: string; options?: { shouldCreateUser?: boolean; emailRedirectTo?: string } }): Promise<{ error: unknown }>;
    verifyOtp(args: { email: string; token: string; type: "email" }): Promise<{ data: { user: User | null } | null; error: unknown }>;
    getSession(): SessionResult;
    setSession(tokens: { access_token: string; refresh_token: string }): SessionResult;
    /** The ?code= return (PKCE): works when this browser started the sign-in. */
    exchangeCodeForSession(code: string): SessionResult;
    signOut(args?: { scope?: "global" | "local" | "others" }): Promise<{ error: unknown }>;
    /** Leaves the page for the provider's sign-in; the provider sends the person back to redirectTo. */
    signInWithOAuth(args: { provider: string; options?: { redirectTo?: string } }): Promise<{ error: unknown }>;
  };
  from(table: "records"): {
    select(columns: string): PromiseLike<{ data: unknown; error: unknown }>;
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
  // the return from signing in is read by resumeAccount, not by the library: the
  // library clears the address with location.hash = "", a navigation Next.js did
  // not make, and the page lost its place (2026-11-02, the first link login)
  return createClient(config.url, config.key, { auth: { detectSessionInUrl: false } }) as unknown as SupabaseLike;
};
let clientPromise: Promise<SupabaseLike> | null = null;
const client = () => (clientPromise ??= clientFactory());

/** Tests only: hand in a fake client and start from a clean state. */
export const setClientFactoryForTests = (factory: () => Promise<SupabaseLike>) => {
  clientFactory = factory;
  clientPromise = null;
  setState(initialState());
};

// ---------- the state the screen draws ----------

export type AccountNote = AuthErrorKey | "sync-failed" | "deleted" | "signed-out";

export type AccountState = {
  phase: "off" | "signed-out" | "code-sent" | "signed-in";
  busy: boolean;
  email?: string;
  /** How this account signs in, for the line shown when it has no email (Naver gives none). */
  provider?: LoginProvider;
  userId?: string;
  /** True right after signing in: the screen moves to 다른 기기에서도 보기 once, then clears it. */
  arrived?: boolean;
  /** The records in the account, with when each last changed. Memory only. */
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

// ---------- when a record last changed ----------

/**
 * The latest ISO time anywhere in a record (createdAt, completedAt, a
 * follow-up's or a later name's `at`). Records carry no updatedAt of their
 * own, and every change a person makes after finishing stamps a time, so this
 * is what 「updated_at이 새것」 compares.
 */
export const lastTouched = (session: EmotionSession): string => {
  let latest = session.createdAt ?? "";
  const walk = (value: unknown) => {
    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}T/.test(value) && value > latest) latest = value;
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(session);
  return latest;
};

const newer = (a: string, b: string) => Date.parse(a) > Date.parse(b);
const isRecord = (value: unknown): value is EmotionSession => Boolean(value && typeof value === "object" && typeof (value as EmotionSession).id === "string");

// ---------- the steps ----------

/** What signing in leaves in the address: tokens after #, or a code (or an error) after ?. */
const HASH_KEYS = /(?:^#|&)(?:access_token|error_description|error)=/;
const QUERY_KEYS = ["code", "error", "error_code", "error_description", "state"] as const;

/**
 * True when the address carries the return from signing in: the email link or
 * a provider button, as # tokens (implicit) or ?code= (PKCE), or their error.
 */
export const isLinkReturn = () => {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  return HASH_KEYS.test(window.location.hash) || query.has("code") || query.has("error") || query.has("error_description");
};

/** The values the return brought, from both places, read before they are wiped. */
const readReturn = () => {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  return {
    access: hash.get("access_token"),
    refresh: hash.get("refresh_token"),
    code: query.get("code"),
    failed: hash.has("error") || hash.has("error_description") || query.has("error") || query.has("error_description"),
  };
};

/**
 * Takes the return's values out of the address bar without a navigation: the
 * whole # part, and code/error/state from the query (anything else in the
 * query stays). The state passed is null on purpose: Next.js then treats it as
 * an outside change and updates its own idea of the address; given its own
 * state back, it would write the old address, tokens and all, at its next
 * update. Called after an await, so Next.js has finished setting up first.
 */
const clearLinkFromAddress = () => {
  const query = new URLSearchParams(window.location.search);
  for (const key of QUERY_KEYS) query.delete(key);
  const rest = query.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
};

const hasStoredLogin = () => {
  if (typeof window === "undefined") return false;
  try {
    return Object.keys(window.localStorage).some((key) => /^sb-.+-auth-token$/.test(key));
  } catch {
    return false;
  }
};

/** Supabase's name for how a user signs in, back to the button it came from. */
const providerOf = (user: User): LoginProvider | undefined => {
  const name = user.app_metadata?.provider;
  return (Object.keys(OAUTH_PROVIDER) as Exclude<LoginProvider, "email">[]).find((key) => OAUTH_PROVIDER[key] === name) ?? (name === "email" ? "email" : undefined);
};

/** Signed in: the account's records come straight in, and this device's are offered once. */
const signedIn = async (user: User, arrived: boolean) => {
  const { data, error } = await (await client()).from("records").select("id, data, updated_at");
  check(error);
  const remote = ((data ?? []) as RemoteRow[]).filter((row) => isRecord(row.data)).map((row) => ({ session: row.data as EmotionSession, updatedAt: row.updated_at }));
  const chosen = readChoices()[user.id];
  const local = getStorageAdapter().loadCompleted();
  // an account without an email (Naver) may carry "" rather than nothing
  setState({ phase: "signed-in", userId: user.id, email: user.email || undefined, provider: providerOf(user), arrived, remote, askImport: chosen ? [] : local.map((session) => session.id) });
};

/** The screen has moved to 다른 기기에서도 보기; do not move it again. */
export const clearArrived = () => { if (state.arrived) setState({ arrived: false }); };

/**
 * Picks up a login this browser already holds, or the one a return from
 * signing in brought (email link or provider button, # tokens or ?code=).
 * Does nothing (and loads nothing) for a guest.
 *
 * A return that did not sign in (an error in the address, or a token or code
 * that no longer works) never reads as 「로그인했어요」: with no earlier login
 * it says the login failed; with an earlier login still held, that login stays
 * and the note says the attempt just made did not work (2026-11-02).
 */
export const resumeAccount = async () => {
  if (state.phase !== "signed-out") return;
  const back = isLinkReturn() ? readReturn() : null;
  if (!back && !hasStoredLogin()) return;
  await run(async () => {
    const auth = (await client()).auth;
    if (back) clearLinkFromAddress();
    if (back && !back.failed) {
      const result = back.access && back.refresh ? await auth.setSession({ access_token: back.access, refresh_token: back.refresh })
        : back.code ? await auth.exchangeCodeForSession(back.code) : null;
      if (result && !result.error && result.data.session) { await signedIn(result.data.session.user, true); return; }
    }
    const { data } = await auth.getSession();
    if (data.session) {
      await signedIn(data.session.user, false);
      if (back) setState({ note: "attempt-failed" });
    } else if (back) setState({ note: back.failed ? "login-failed" : "link-expired" });
  });
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendCode = (email: string) => run(async () => {
  const address = email.trim();
  if (!EMAIL.test(address)) { setState({ note: "email-invalid" }); return; }
  const { error } = await (await client()).auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: returnAddress() } });
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

/** Where every sign-in comes back to: this page, without any old query or token. */
const returnAddress = () => `${window.location.origin}${window.location.pathname}`;

/**
 * 구글·카카오·네이버·Apple로 계속하기: the page leaves for the provider and comes
 * back to returnAddress(), where resumeAccount finishes the sign-in.
 */
export const signInWith = (provider: Exclude<LoginProvider, "email">) => run(async () => {
  const { error } = await (await client()).auth.signInWithOAuth({ provider: OAUTH_PROVIDER[provider], options: { redirectTo: returnAddress() } });
  if (error) setState({ note: "provider-failed" });
});

/** Back from the code step to the email step. */
export const changeEmail = () => setState({ phase: "signed-out", note: undefined });

const upload = async (sessions: EmotionSession[]) => {
  const userId = state.userId;
  if (!userId || sessions.length === 0) return;
  const rows: SentRow[] = sessions.map((session) => ({ user_id: userId, id: session.id, data: session, updated_at: lastTouched(session) }));
  const { error } = await (await client()).from("records").upsert(rows, { onConflict: "user_id,id" });
  check(error);
  const sent = new Set(rows.map((row) => row.id));
  setState({ remote: [...state.remote.filter((item) => !sent.has(item.session.id)), ...rows.map((row) => ({ session: row.data, updatedAt: row.updated_at }))] });
};

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
 * Called after every save on this device. While signed in, a finished or
 * stopped record is sent; a draft, a record kept on this device, or one still
 * waiting for the 가져오기 answer is not.
 */
export const recordSaved = (session: EmotionSession) => {
  if (state.phase !== "signed-in" || session.status === "draft") return;
  if (state.askImport.includes(session.id)) return;
  if (readChoices()[state.userId ?? ""]?.keptIds.includes(session.id)) return;
  void upload([session]).catch(() => setState({ note: "sync-failed" }));
};

const forget = (note: AccountNote) => {
  setState({ phase: "signed-out", email: undefined, provider: undefined, userId: undefined, arrived: false, remote: [], askImport: [], note });
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
