/**
 * Login and synced locked records (owner's decision 2026-11-02, preview only).
 *
 * Both values are public by design: the project address and the publishable
 * key may sit in the browser. The secret key is never used by this app. When
 * either is missing (production, tests, a fresh clone) the login entry is not
 * drawn at all and the app is exactly the guest app it was.
 *
 * Read as literal `process.env.NEXT_PUBLIC_…` so Next.js inlines them at build.
 */
export type SupabaseConfig = { url: string; key: string };

export const supabaseConfig = (): SupabaseConfig | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
};

export const loginAvailable = () => supabaseConfig() !== null;

/** The origin the page may connect to for login, or "" when login is off. */
export const supabaseOrigin = (url: string | undefined): string => {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

/**
 * The ways to sign in, in the order the buttons are drawn (owner's decision
 * 2026-11-02): Google, Kakao, Naver, Apple, then email. Which are shown comes
 * from NEXT_PUBLIC_LOGIN_PROVIDERS (comma separated, e.g. "google,email"), so
 * a way not yet set up in Supabase never shows a button. Without the value,
 * email only.
 */
export const LOGIN_PROVIDERS = ["google", "kakao", "naver", "apple", "email"] as const;
export type LoginProvider = (typeof LOGIN_PROVIDERS)[number];

export const loginProviders = (): LoginProvider[] => {
  const raw = process.env.NEXT_PUBLIC_LOGIN_PROVIDERS;
  const wanted = new Set((raw?.trim() ? raw : "email").split(",").map((name) => name.trim().toLowerCase()));
  return LOGIN_PROVIDERS.filter((name) => wanted.has(name));
};

/** Supabase's provider name for each button; Naver is a custom provider in Supabase. */
export const OAUTH_PROVIDER: Record<Exclude<LoginProvider, "email">, string> = {
  google: "google",
  kakao: "kakao",
  naver: "custom:naver",
  apple: "apple",
};
