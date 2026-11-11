import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { getAccountState, lastTouched, mergeRecords, recordSaved, resumeAccount, setClientFactoryForTests, type SupabaseLike } from "../lib/account";
import { ko, koOnly } from "../lib/i18n/messages.ko";
import type { EmotionSession } from "../lib/session-types";
import { getStorageAdapter } from "../lib/storage-adapter";
import { loginAvailable, loginProviders } from "../lib/supabase-config";

/**
 * Login and records on the server (owner's decision 2026-11-02, changed the
 * same day: no 기록 암호; buttons for Google, Kakao, Naver, Apple and email;
 * preview only). A fake Supabase client stands in for the server and keeps
 * every value the app hands it.
 */
const copy = koOnly.account;
const MEMO = "친구와 통화했다";
const USER = "00000000-0000-4000-8000-000000000001";
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

const record = (id: string, at = "2026-10-01T09:04:00.000Z"): EmotionSession => ({
  id, createdAt: "2026-10-01T09:00:00.000Z", completedAt: at, status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.3, activation: 0.6 }, candidatePool: [{ label: "긴장", source: "suggested" }], selected: [{ label: "긴장", source: "suggested" }] },
  deepReflection: { startedAt: "2026-10-01T09:00:00.000Z", body: [], concerns: [], emotionCandidates: [], context: { eventText: MEMO, source: "event" } },
});

type Row = { user_id: string; id: string; data: EmotionSession; updated_at: string };
type Fake = { client: SupabaseLike; sent: { what: string; value: unknown }[]; db: { records: Row[] }; signedInEarlier: () => void };
type FakeUser = { id: string; email?: string; app_metadata?: { provider?: string } };
const makeFake = (user: FakeUser = { id: USER, email: "me@example.com", app_metadata: { provider: "google" } }): Fake => {
  const sent: Fake["sent"] = [];
  const db: Fake["db"] = { records: [] };
  let session: { user: typeof user } | null = null;
  const log = (what: string, value: unknown) => { sent.push({ what, value }); };
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      setSession: async (tokens: { access_token: string }) => {
        log("setSession", tokens.access_token);
        if (tokens.access_token !== "good-access") return { data: { session: null }, error: { code: "bad_jwt" } };
        session = { user };
        return { data: { session }, error: null };
      },
      exchangeCodeForSession: async (code: string) => {
        log("exchange", code);
        if (code !== "good-code") return { data: { session: null }, error: { code: "flow_state_not_found" } };
        session = { user };
        return { data: { session }, error: null };
      },
      signInWithOAuth: async (args: unknown) => { log("oauth", args); return { error: null }; },
      signOut: async (args: unknown) => { log("signOut", args); session = null; return { error: null }; },
    },
    from: (table: "records") => ({
      select: (columns: string) => { log(`select:${table}`, columns); return Promise.resolve({ data: db.records.map(({ id, data, updated_at }) => ({ id, data, updated_at })), error: null }); },
      upsert: async (rows: Row[], options?: { onConflict?: string }) => {
        log(`upsert:${table}`, { rows, options });
        for (const row of rows) db.records = [...db.records.filter((item) => item.id !== row.id), row];
        return { error: null };
      },
    }),
    rpc: async (name: string) => { log("rpc", name); db.records = []; session = null; return { error: null }; },
  };
  return { client: client as unknown as SupabaseLike, sent, db, signedInEarlier: () => { session = { user }; } };
};

const loginOn = (providers = "google,kakao,naver") => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_LOGIN_PROVIDERS", providers);
};
const openRecords = () => { render(<Home />); fireEvent.click(screen.getByRole("button", { name: ko.landing.records })); };
const panel = () => screen.getByRole("region", { name: copy.title });
const type = (label: string, value: string) => fireEvent.change(within(panel()).getByLabelText(label), { target: { value } });
const press = (name: string) => fireEvent.click(within(panel()).getByRole("button", { name }));
const BOXES = [copy.consentAccount, copy.consentRecords, copy.consentAge];
const agree = () => { for (const label of BOXES) fireEvent.click(within(panel()).getByLabelText(label)); };
const loginButtons = () => [...panel().querySelectorAll(".login-buttons button")] as HTMLButtonElement[];

let fake: Fake;
const sentWhat = () => fake.sent.map((item) => item.what);

/** Back from a provider's sign-in with # tokens: the app opens on 다른 기기에서도 보기, signed in. */
const signInByReturn = async () => {
  window.history.replaceState(null, "", "/#access_token=good-access&refresh_token=good-refresh&token_type=bearer");
  render(<Home />);
  await waitFor(() => expect(getAccountState().phase).toBe("signed-in"));
};

let factory: ReturnType<typeof vi.fn<() => Promise<SupabaseLike>>>;
let fetchSpy: { mockRestore(): void };
let fetchCalls: () => number;
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  fake = makeFake();
  factory = vi.fn<() => Promise<SupabaseLike>>(async () => fake.client);
  const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in tests"));
  fetchSpy = spy;
  fetchCalls = () => spy.mock.calls.length;
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  fetchSpy.mockRestore();
  window.history.replaceState(null, "", "/");
  setClientFactoryForTests(factory);
});

describe("without the login values", () => {
  it("draws no login entry, loads no client and makes no request in the guest flow", async () => {
    setClientFactoryForTests(factory);
    getStorageAdapter().saveCompleted(record(ID_A));
    openRecords();
    expect(screen.queryByText(copy.open)).toBeNull();
    expect(screen.queryByRole("region", { name: copy.title })).toBeNull();
    recordSaved(record(ID_B));
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
    getStorageAdapter().saveCompleted(record(ID_A));
    openRecords();
    expect(within(panel()).getByRole("button", { name: copy.open })).toBeTruthy();
    recordSaved(record(ID_B));
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

describe("the sign-in buttons", () => {
  const labels = () => loginButtons().map((button) => button.textContent);

  it("follow NEXT_PUBLIC_LOGIN_PROVIDERS, always in the order Google, Kakao, Naver, Apple, with no email login", () => {
    for (const [value, expected] of [
      ["", []],
      ["email", []],
      ["google,email", ["google"]],
      ["email, apple ,NAVER,kakao,google", ["google", "kakao", "naver", "apple"]],
      ["google,line", ["google"]],
    ] as const) {
      vi.stubEnv("NEXT_PUBLIC_LOGIN_PROVIDERS", value);
      expect(loginProviders(), value).toEqual(expected);
    }
  });

  it("shows only the ways that are set up", () => {
    loginOn("google,email");
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    expect(labels()).toEqual([copy.providers.google]);
    cleanup();
    loginOn("google,kakao,naver,apple,email");
    openRecords();
    press(copy.open);
    expect(labels()).toEqual([copy.providers.google, copy.providers.kakao, copy.providers.naver, copy.providers.apple]);
    expect(JSON.stringify(copy)).not.toMatch(/이메일로 계속하기|6자리 코드|코드 받기/);
  });

  it("draw no login entry at all when no way to sign in is set up, email included", async () => {
    for (const value of ["", "email"]) {
      loginOn(value);
      setClientFactoryForTests(factory);
      expect(loginAvailable()).toBe(false);
      expect(getAccountState().phase).toBe("off");
      openRecords();
      expect(screen.queryByRole("region", { name: copy.title })).toBeNull();
      await act(async () => { await resumeAccount(); });
      expect(factory).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("cannot be pressed before all three agreements, age included, which come before every button", () => {
    loginOn("google,kakao,naver,apple");
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    const boxes = BOXES.map((label) => within(panel()).getByLabelText(label));
    expect(boxes).toHaveLength(3);
    for (const button of loginButtons()) {
      expect(button, button.textContent!).toBeDisabled();
      for (const box of boxes) expect(box.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      fireEvent.click(button);
    }
    // any two of the three are not enough
    for (const missing of [0, 1, 2]) {
      boxes.forEach((box, index) => { if ((box as HTMLInputElement).checked !== (index !== missing)) fireEvent.click(box); });
      for (const button of loginButtons()) { expect(button).toBeDisabled(); fireEvent.click(button); }
    }
    expect(fake.sent).toEqual([]);
    expect(factory).not.toHaveBeenCalled();
    boxes.forEach((box) => { if (!(box as HTMLInputElement).checked) fireEvent.click(box); });
    for (const button of loginButtons()) expect(button).toBeEnabled();
  });

  it("call signInWithOAuth with the right provider and this page as the way back", async () => {
    loginOn("google,kakao,naver,apple,email");
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    agree();
    for (const name of ["google", "kakao", "naver", "apple"] as const) {
      press(copy.providers[name]);
      await waitFor(() => expect(getAccountState().busy).toBe(false));
    }
    const back = `${window.location.origin}/`;
    expect(fake.sent.filter((item) => item.what === "oauth").map((item) => item.value)).toEqual([
      { provider: "google", options: { redirectTo: back } },
      { provider: "kakao", options: { redirectTo: back } },
      { provider: "custom:naver", options: { redirectTo: back } },
      { provider: "apple", options: { redirectTo: back } },
    ]);
  });

  it("come after the owner's consent wording (2026-11-02), shown in full, with the privacy policy link before the boxes", () => {
    loginOn();
    setClientFactoryForTests(factory);
    openRecords();
    press(copy.open);
    expect(copy.consentLead).toBe("로그인하면 다른 기기에서도 기록을 볼 수 있어요.");
    expect(copy.consentPoints).toEqual([
      "받는 것: 로그인한 계정의 이메일 주소(네이버는 식별 번호), 기록",
      "기록은 서버에 저장돼요. 다른 사용자는 볼 수 없어요.",
      "서비스를 관리하는 만든 사람은 관리 화면에서 기록을 볼 수 있어요. 필요한 경우에만 열어요.",
      "서버는 Supabase(미국 회사)이고, 서울에 있어요.",
      "만 14세 미만은 로그인할 수 없어요.",
      "언제든 「계정 지우기」로 서버의 계정과 기록을 모두 지울 수 있어요.",
    ]);
    expect(BOXES).toEqual(["위 내용을 읽었고, 계정 정보와 기록을 맡기는 데 동의해요 (필수)", "감정 기록을 맡기는 데 따로 동의해요 (필수)", "만 14세 이상이에요 (필수)"]);
    expect(copy.continueAsGuest).toBe("로그인 안 하고 계속 쓰기");
    const text = panel().textContent!;
    for (const line of [copy.consentLead, ...copy.consentPoints, copy.privacyLink, ...BOXES, copy.continueAsGuest]) expect(text).toContain(line);
    const link = within(panel()).getByRole("link", { name: "개인정보 처리방침 보기" });
    expect(link.getAttribute("href")).toBe("/privacy");
    for (const label of BOXES) expect(link.compareDocumentPosition(within(panel()).getByLabelText(label)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(JSON.stringify(copy)).not.toMatch(/기록 암호/);
  });
});

describe("coming back signed in", () => {
  const arriveAt = (address: string) => {
    window.history.replaceState(null, "", address);
    render(<Home />);
  };

  it("with # tokens, goes straight to 다른 기기에서도 보기, focused, and wipes the tokens", async () => {
    loginOn("google,email");
    setClientFactoryForTests(factory);
    arriveAt("/#access_token=good-access&refresh_token=good-refresh&token_type=bearer");
    expect(await within(panel()).findByText(copy.arrived)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.records.title);
    await waitFor(() => expect(document.activeElement).toBe(within(panel()).getByText(copy.title)));
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toMatch(/access|refresh|token/);
  });

  it("with ?code=, exchanges it, goes to the same spot, and wipes code and state but keeps the rest of the query", async () => {
    loginOn("google,email");
    setClientFactoryForTests(factory);
    arriveAt("/?keep=1&code=good-code&state=xyz");
    expect(await within(panel()).findByText(copy.arrived)).toBeTruthy();
    expect(fake.sent.filter((item) => item.what === "exchange").map((item) => item.value)).toEqual(["good-code"]);
    expect(window.location.search).toBe("?keep=1");
    expect(window.location.href).not.toMatch(/good-code|state=/);
  });

  it("with a provider's error, a dead token or a code from elsewhere, says so on the same spot and wipes the address", async () => {
    loginOn("google,email");
    setClientFactoryForTests(factory);
    arriveAt("/?error=access_denied&error_description=cancelled");
    expect(await within(panel()).findByText(copy.notes["login-failed"])).toBeTruthy();
    expect(copy.notes["login-failed"]).toBe("로그인하지 못했어요. 다시 해 주세요.");
    expect(window.location.search).toBe("");
    expect(sentWhat()).not.toContain("exchange");
    cleanup();
    setClientFactoryForTests(factory);
    arriveAt("/?error=server_error");
    expect(await within(panel()).findByText(copy.notes["login-failed"])).toBeTruthy();
    expect(window.location.search).toBe("");
    cleanup();
    setClientFactoryForTests(factory);
    arriveAt("/#error=access_denied&error_code=otp_expired");
    expect(await within(panel()).findByText(copy.notes["login-failed"])).toBeTruthy();
    expect(window.location.hash).toBe("");
    cleanup();
    setClientFactoryForTests(factory);
    arriveAt("/#access_token=old&refresh_token=old");
    expect(await within(panel()).findByText(copy.notes["login-failed"])).toBeTruthy();
    expect(window.location.hash).toBe("");
    cleanup();
    setClientFactoryForTests(factory);
    arriveAt("/?code=from-another-browser");
    expect(await within(panel()).findByText(copy.notes["login-failed"])).toBeTruthy();
    expect(window.location.search).toBe("");
  });

  it("wipes the tokens even when the client cannot be loaded (offline)", async () => {
    loginOn("google");
    setClientFactoryForTests(async () => { throw new Error("offline"); });
    arriveAt("/?keep=1&code=good-code&state=xyz#access_token=good-access&refresh_token=good-refresh");
    await waitFor(() => expect(getAccountState().note).toBe("network"));
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("?keep=1");
    expect(window.location.href).not.toMatch(/access|refresh|good-code|state=/);
  });
});

describe("coming back from a failed sign-in while an earlier login is still held", () => {
  const arriveAt = (address: string) => {
    window.history.replaceState(null, "", address);
    render(<Home />);
  };

  it("keeps the earlier login, says the attempt did not work, never 「로그인했어요.」, and wipes the address", async () => {
    for (const address of ["/?error=access_denied&error_description=cancelled", "/#error=access_denied&error_description=cancelled", "/#access_token=old&refresh_token=old", "/?code=from-another-browser"]) {
      loginOn("google,naver,email");
      fake = makeFake();
      fake.signedInEarlier();
      setClientFactoryForTests(factory);
      arriveAt(address);
      expect(await within(panel()).findByText(copy.notes["attempt-failed"]), address).toBeTruthy();
      expect(copy.notes["attempt-failed"]).toBe("방금 시도한 로그인은 되지 않았어요.");
      expect(getAccountState().phase, address).toBe("signed-in");
      expect(within(panel()).queryByText(copy.arrived), address).toBeNull();
      expect(within(panel()).getByRole("button", { name: copy.signOut })).toBeTruthy();
      expect(window.location.href, address).not.toMatch(/error|access|code=/);
      cleanup();
    }
  });
});

describe("an account without an email", () => {
  it("is named by how it signs in: 「네이버 계정으로 로그인했어요.」, and the same rule for the others", async () => {
    expect(copy.signedInWith.replace("{provider}", copy.providerNames.naver)).toBe("네이버 계정으로 로그인했어요.");
    for (const [supabaseName, name] of [["custom:naver", "naver"], ["kakao", "kakao"], ["google", "google"], ["apple", "apple"]] as const) {
      for (const email of [undefined, ""]) {
        loginOn("google,kakao,naver,apple,email");
        fake = makeFake({ id: USER, email, app_metadata: { provider: supabaseName } });
        setClientFactoryForTests(factory);
        window.history.replaceState(null, "", "/#access_token=good-access&refresh_token=good-refresh");
        render(<Home />);
        const line = copy.signedInWith.replace("{provider}", copy.providerNames[name]);
        expect(await within(panel()).findByText(line), supabaseName).toBeTruthy();
        expect(getAccountState().provider).toBe(name);
        expect(getAccountState().email).toBeUndefined();
        // said once: no bare 「로그인했어요.」 beside it, and no 「 계정이에요.」 with an empty address
        expect(within(panel()).queryByText(copy.arrived)).toBeNull();
        expect(panel().textContent).not.toContain(copy.signedInAs.replace("{email}", ""));
        expect(panel().textContent).toContain(copy.syncOn);
        cleanup();
      }
    }
  });

  it("keeps the address line when there is an email", async () => {
    loginOn("google,email");
    fake = makeFake({ id: USER, email: "me@gmail.com", app_metadata: { provider: "google" } });
    setClientFactoryForTests(factory);
    window.history.replaceState(null, "", "/#access_token=good-access&refresh_token=good-refresh");
    render(<Home />);
    expect(await within(panel()).findByText(copy.arrived)).toBeTruthy();
    expect(panel().textContent).toContain(copy.signedInAs.replace("{email}", "me@gmail.com"));
    expect(panel().textContent).not.toContain(copy.signedInWith.replace("{provider}", copy.providerNames.google));
  });
});

describe("the records on the server", () => {
  it("count for 「지난번」: the record just before may be one only the account holds", async () => {
    const withBody = (id: string, at: string, label: string): EmotionSession => {
      const base = record(id, at);
      return { ...base, deepReflection: { ...base.deepReflection!, body: [{ label }] } };
    };
    const older = withBody(ID_A, "2026-10-01T09:04:00.000Z", "어깨가 뭉침");
    const onlyOnAccount = withBody(ID_B, "2026-10-02T09:04:00.000Z", "숨이 얕음");
    const now = withBody("33333333-3333-4333-8333-333333333333", "2026-10-03T09:04:00.000Z", "배가 아픔");
    window.localStorage.setItem("emotion-lab:account-import:v1", JSON.stringify({ [USER]: { choice: "kept", keptIds: [] } }));
    getStorageAdapter().saveCompleted(older);
    getStorageAdapter().saveCompleted(now);
    loginOn();
    setClientFactoryForTests(factory);
    fake.db.records = [{ user_id: USER, id: ID_B, data: onlyOnAccount, updated_at: "2026-10-02T09:04:00+00:00" }];
    await signInByReturn();
    fireEvent.click(document.getElementById(`record-${now.id}`)!);
    const lines = [...document.querySelectorAll(".previous-line")].map((line) => line.textContent);
    expect(lines).toContain(ko.recordDetail.previous.replace("{date}", "10/02").replace("{value}", "숨이 얕음"));
    expect(lines.join(" ")).not.toContain("어깨가 뭉침");
  });

  it("come in as soon as the person signs in, shown in the list but not written into this browser", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    fake.db.records = [{ user_id: USER, id: ID_A, data: record(ID_A), updated_at: "2026-10-01T09:04:00+00:00" }];
    await signInByReturn();
    expect(getAccountState().remote.map((item) => item.session.deepReflection?.context?.eventText)).toEqual([MEMO]);
    expect(screen.getAllByRole("button").some((button) => button.classList.contains("record-row"))).toBe(true);
    expect(getStorageAdapter().loadCompleted()).toEqual([]);
  });

  it("are sent as user_id, id, data and updated_at, matched on user_id and id together", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    getStorageAdapter().saveCompleted(record(ID_A));
    await signInByReturn();
    expect(await within(panel()).findByText(copy.importQuestion.replace("{count}", "1"))).toBeTruthy();
    press(copy.importConfirm);
    await waitFor(() => expect(fake.db.records).toHaveLength(1));
    recordSaved(record(ID_B));
    await waitFor(() => expect(fake.db.records).toHaveLength(2));
    const upserts = fake.sent.filter((item) => item.what === "upsert:records").map((item) => item.value as { rows: Row[]; options?: { onConflict?: string } });
    expect(upserts).toHaveLength(2);
    for (const { rows, options } of upserts) {
      expect(options).toEqual({ onConflict: "user_id,id" });
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(["data", "id", "updated_at", "user_id"]);
        expect(row.user_id).toBe(USER);
        expect(row.data.id).toBe(row.id);
        expect(row.updated_at).toBe(lastTouched(row.data));
      }
    }
  });

  it("do not include this device's records unless 「가져오기」 is chosen; after 「이 기기에만 두기」 they are never sent", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    const here = record(ID_A);
    getStorageAdapter().saveCompleted(here);
    await signInByReturn();
    expect(sentWhat()).not.toContain("upsert:records");
    // saved while the question is still open: not sent
    recordSaved({ ...here, labelsLater: [{ label: "서운함", at: "2026-10-02T09:00:00.000Z" }] });
    await act(async () => { await Promise.resolve(); });
    expect(sentWhat()).not.toContain("upsert:records");
    press(copy.importKeep);
    recordSaved({ ...here, labelsLater: [{ label: "서운함", at: "2026-10-03T09:00:00.000Z" }] });
    await act(async () => { await Promise.resolve(); });
    expect(sentWhat()).not.toContain("upsert:records");
    expect(getStorageAdapter().loadCompleted().map((session) => session.id)).toEqual([here.id]);

    // the answer is remembered for this account
    setClientFactoryForTests(factory);
    window.localStorage.setItem("sb-example-auth-token", "{}");
    await act(async () => { await resumeAccount(); });
    expect(getAccountState().phase).toBe("signed-in");
    expect(getAccountState().askImport).toEqual([]);
  });

  it("leave drafts on the device", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    await signInByReturn();
    recordSaved({ ...record(ID_B), status: "draft" });
    await act(async () => { await Promise.resolve(); });
    expect(sentWhat()).not.toContain("upsert:records");
  });

  it("go with the account after asking once; this device's records stay", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    const here = record(ID_A);
    getStorageAdapter().saveCompleted(here);
    await signInByReturn();
    press(copy.importConfirm);
    await waitFor(() => expect(fake.db.records).toHaveLength(1));
    press(copy.deleteAccount);
    expect(sentWhat()).not.toContain("rpc");
    fireEvent.click(within(within(panel()).getByRole("group", { name: copy.deleteConfirmTitle })).getByRole("button", { name: copy.deleteConfirm }));
    expect(await within(panel()).findByText(copy.notes.deleted)).toBeTruthy();
    expect(fake.sent.filter((item) => item.what === "rpc").map((item) => item.value)).toEqual(["delete_my_account"]);
    expect(getStorageAdapter().loadCompleted().map((session) => session.id)).toEqual([here.id]);
    expect(getAccountState().remote).toEqual([]);
  });

  it("stay on the device after 로그아웃, which sits apart from the step's buttons", async () => {
    loginOn();
    setClientFactoryForTests(factory);
    getStorageAdapter().saveCompleted(record(ID_A));
    await signInByReturn();
    const importButton = within(panel()).getByRole("button", { name: copy.importConfirm });
    const signOutButton = within(panel()).getByRole("button", { name: copy.signOut });
    expect(importButton.parentElement).not.toBe(signOutButton.parentElement);
    press(copy.signOut);
    expect(await within(panel()).findByText(copy.notes["signed-out"])).toBeTruthy();
    expect(getStorageAdapter().loadCompleted().map((session) => session.id)).toEqual([ID_A]);
  });
});

describe("joining the two lists", () => {
  it("keeps this device's list as it is when the account has nothing", () => {
    const local = [record("a")];
    expect(mergeRecords(local, [])).toBe(local);
  });

  it("joins by id and shows the newer copy", () => {
    const older = record("a");
    const newer = { ...record("a"), labelsLater: [{ label: "서운함", at: "2026-10-03T09:00:00.000Z" }] };
    expect(mergeRecords([older], [{ session: newer, updatedAt: "2026-10-03T09:00:00+00:00" }])[0]).toBe(newer);
    expect(mergeRecords([newer], [{ session: older, updatedAt: lastTouched(older) }])[0]).toBe(newer);
    expect(mergeRecords([record("a")], [{ session: record("b"), updatedAt: lastTouched(record("b")) }]).map((session) => session.id).sort()).toEqual(["a", "b"]);
  });
});
