import type { Metadata } from "next";
import "../../globals.css";
import { metadataFor } from "../../../lib/i18n/metadata";
import KoreanDocument from "../../korean-document";
import { fontVariables } from "../../fonts";

import { englishAvailable } from "../../../lib/i18n/availability";

/**
 * The root layout for English: its own <html lang="en">, with the same type as
 * Korean (the Latin glyphs of Noto Sans KR and Noto Serif KR, as on the homepage).
 *
 * If English is switched off again (`reviewStatus` back to "draft"), a production
 * build blocks /en (the page calls notFound()) and that 404 is drawn inside this
 * layout. Then the Korean document shell, title and description are used, so the
 * /en 404 is the same as the 404 for any other unknown address.
 */
const blocked = process.env.NODE_ENV === "production" && !englishAvailable();

export const metadata: Metadata = metadataFor(blocked ? "ko" : "en");

export default function EnglishRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (blocked) return <KoreanDocument>{children}</KoreanDocument>;
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
