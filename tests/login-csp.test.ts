// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The page may connect only to its own origin (tests/no-network.test.ts). The
 * login preview (2026-11-02) adds exactly one origin, the Supabase project's,
 * and only where the login values are set; production has none, so its
 * policy stays 'self' only.
 */
const connectSrc = async () => {
  vi.resetModules();
  const { default: config } = await import("../next.config");
  const [{ headers }] = await config.headers!();
  const policy = headers.find((header) => header.key === "Content-Security-Policy")!.value;
  return policy.split("; ").find((part) => part.startsWith("connect-src"));
};

describe("where the page may connect", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is its own origin only without the login values", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await connectSrc()).toBe("connect-src 'self'");
  });

  it("adds only the Supabase project's origin with them", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://oryauvqfnfbvmqfafbyi.supabase.co");
    expect(await connectSrc()).toBe("connect-src 'self' https://oryauvqfnfbvmqfafbyi.supabase.co");
  });
});
