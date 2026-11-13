import { Instrument_Serif, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

/**
 * The homepage's type: Noto Sans KR for text and controls, Noto Serif KR for
 * headings, regular weight (400) only. Medium (500) was left out to keep the
 * font transfer down (owner's choice, alternative 3 in docs/DESIGN_ALIGNMENT.md).
 * next/font downloads them at build time and serves them from this site, so a
 * visitor's browser never contacts Google. `display: "swap"` and the size-matched
 * fallback are next/font defaults, written out here so they are not lost.
 * English (/en) uses the same two faces for their Latin glyphs; no separate English face is loaded.
 *
 * One exception (2026-11-13): the header wordmark "Eunchan Joe" is set in Instrument Serif 400,
 * the homepage's own wordmark face, so the three sites' headers show the same name in the same type.
 * It is used by .site-logo-text only, and is self-hosted the same way.
 */
const sans = Noto_Sans_KR({ weight: "400", subsets: ["latin"], display: "swap", adjustFontFallback: true, variable: "--font-sans" });
const serif = Noto_Serif_KR({ weight: "400", subsets: ["latin"], display: "swap", adjustFontFallback: true, variable: "--font-serif" });
const wordmark = Instrument_Serif({ weight: "400", subsets: ["latin"], display: "swap", adjustFontFallback: true, variable: "--font-wordmark" });

/** Class names that define --font-sans, --font-serif and --font-wordmark on <html>. */
export const fontVariables = `${sans.variable} ${serif.variable} ${wordmark.variable}`;
