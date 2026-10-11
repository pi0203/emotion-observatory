import type { Metadata } from "next";
import "../../globals.css";
import { metadataFor } from "../../../lib/i18n/metadata";
import KoreanDocument from "../../korean-document";

/**
 * The root layout for English: its own <html lang="en"> in development.
 *
 * In a production build /en is blocked (the page calls notFound()), and that 404
 * is drawn inside this layout. So production uses the Korean document shell,
 * title and description, making the /en 404 the same as the 404 for any other
 * unknown address. Remove this production branch in stage F, when English is
 * published (docs/I18N_PLAN.md).
 */
const blocked = process.env.NODE_ENV === "production";

export const metadata: Metadata = metadataFor(blocked ? "ko" : "en");

export default function EnglishRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (blocked) return <KoreanDocument>{children}</KoreanDocument>;
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
