import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

/**
 * The homepage's type: Noto Sans KR for text and controls, Noto Serif KR for
 * headings, regular weight (400) only. Medium (500) was left out to keep the
 * font transfer down (owner's choice, alternative 3 in docs/DESIGN_ALIGNMENT.md).
 * next/font downloads them at build time and serves them from this site, so a
 * visitor's browser never contacts Google. `display: "swap"` and the size-matched
 * fallback are next/font defaults, written out here so they are not lost.
 * English (/en) uses the same two faces for their Latin glyphs; no separate English face is loaded.
 */
const sans = Noto_Sans_KR({ weight: "400", subsets: ["latin"], display: "swap", adjustFontFallback: true, variable: "--font-sans" });
const serif = Noto_Serif_KR({ weight: "400", subsets: ["latin"], display: "swap", adjustFontFallback: true, variable: "--font-serif" });

/** Class names that define --font-sans and --font-serif on <html>. */
export const fontVariables = `${sans.variable} ${serif.variable}`;
