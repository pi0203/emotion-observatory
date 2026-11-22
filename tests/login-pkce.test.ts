import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseLike } from "../lib/account";

/**
 * The sign-in comes back with ?code= (PKCE), not with tokens after # (owner's
 * request 2026-11-22: no tokens in the browser history). The real client
 * factory runs here, so @supabase/supabase-js is replaced by a fake createClient
 * that keeps the options it is given.
 */
const created = vi.hoisted(() => [] as { url: string; key: string; options: unknown }[]);
const sent = vi.hoisted(() => [] as { what: string; value: unknown }[]);

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string, options: unknown) => {
    created.push({ url, key, options });
    const user = { id: "00000000-0000-4000-8000-000000000001", email: "me@example.com", app_metadata: { provider: "google" } };
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        setSession: async (tokens: unknown) => { sent.push({ what: "setSession", value: tokens }); return { data: { session: null }, error: { code: "bad_jwt" } }; },
        exchangeCodeForSession: async (code: string) => {
          // the address is already wiped when the code is exchanged
          sent.push({ what: "exchange", value: { code, address: window.location.href } });
          return { data: { session: { user } }, error: null };
        },
        signInWithOAuth: async (args: unknown) => { sent.push({ what: "oauth", value: args }); return { error: null }; },
        signOut: async () => ({ error: null }),
      },
      from: () => ({ select: async () => ({ data: [], error: null }), upsert: async () => ({ error: null }) }),
      rpc: async () => ({ error: null }),
    };
    return client as unknown as SupabaseLike;
  },
}));

/** The account module reads the login values when it loads, so each test loads it fresh. */
const loadAccount = async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_LOGIN_PROVIDERS", "google,kakao,naver");
  vi.resetModules();
  return import("../lib/account");
};

beforeEach(() => {
  created.length = 0;
  sent.length = 0;
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});

describe("the login client", () => {
  it("asks for the PKCE flow and still reads the return itself", async () => {
    const account = await loadAccount();
    window.history.replaceState(null, "", "/?code=good-code");
    await account.resumeAccount();
    expect(created).toHaveLength(1);
    expect(created[0].options).toEqual({ auth: { detectSessionInUrl: false, flowType: "pkce" } });
  });
});

describe("coming back with ?code=", () => {
  it("exchanges the code, signs in, and the code is gone from the address before and after", async () => {
    const account = await loadAccount();
    window.history.replaceState(null, "", "/records?keep=1&code=good-code&state=xyz");
    await account.resumeAccount();
    const exchanges = sent.filter((item) => item.what === "exchange");
    expect(exchanges.map((item) => (item.value as { code: string }).code)).toEqual(["good-code"]);
    expect((exchanges[0].value as { address: string }).address).not.toMatch(/code=|state=/);
    expect(sent.map((item) => item.what)).not.toContain("setSession");
    expect(account.getAccountState().phase).toBe("signed-in");
    expect(window.location.pathname).toBe("/records");
    expect(window.location.search).toBe("?keep=1");
    expect(window.location.href).not.toMatch(/good-code|code=|state=/);
  });

  it("sends the sign-in back to this page with no query, so the code is the only thing added", async () => {
    const account = await loadAccount();
    window.history.replaceState(null, "", "/records?keep=1");
    await account.signInWith("naver");
    expect(sent.find((item) => item.what === "oauth")?.value).toEqual({ provider: "custom:naver", options: { redirectTo: `${window.location.origin}/records` } });
  });
});
