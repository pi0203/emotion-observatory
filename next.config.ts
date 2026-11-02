import type { NextConfig } from "next";
import { supabaseOrigin } from "./lib/supabase-config";

const isDev = process.env.NODE_ENV === "development";
// login preview only (2026-11-02): set on Vercel's Preview environment, absent in Production
const loginOrigin = supabaseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Response headers for every page (docs/SECURITY_HEADERS.md).
 *
 * The records live in localStorage, so the one thing a script injected into
 * this origin could do is read them and send them somewhere. The policy below
 * keeps that surface small without a per-request nonce, which would force
 * every page to render on each request instead of being served prebuilt:
 *
 * - connect-src 'self': the page can only talk to its own origin, so nothing
 *   can be posted elsewhere. The guest app makes no network calls at all.
 *   Only where the login values are set (the Preview environment, 2026-11-02)
 *   is the Supabase project's own origin added, for the opt-in login and the
 *   records locked on the device before they are sent.
 * - frame-ancestors: only this site and the owner's homepage may frame the
 *   app, so no other page can lay a transparent copy over its own buttons
 *   (clickjacking). X-Frame-Options cannot express the homepage exception.
 * - script-src keeps 'unsafe-inline' because Next.js hydrates with inline
 *   scripts; 'unsafe-eval' and the ws: connection are for development only.
 * - img-src allows data: and blob: for the export download and inline icons.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}` + (loginOrigin ? ` ${loginOrigin}` : ""),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://eunchanjoe.vercel.app",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // never guess a content type from bytes (keeps an uploaded/odd file from running as script)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // outbound links (DOI, helplines) learn only the origin, never the path
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // the app uses none of these device features; say so explicitly
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // belt and braces for browsers that ignore frame-ancestors (same-origin only)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // One root layout per language (app/(ko), app/(en)) leaves no single layout
    // for unmatched addresses; app/global-not-found.tsx draws that 404 instead.
    globalNotFound: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
