import { type Locale } from "../lib/i18n/locale";
import { structuredDataFor } from "../lib/structured-data";

/** The page's JSON-LD (lib/structured-data.ts), escaped as in the Next.js JSON-LD guide so no "<" can end the script early. */
export default function StructuredData({ locale }: Readonly<{ locale: Locale }>) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataFor(locale)).replace(/</g, "\\u003c") }} />;
}
