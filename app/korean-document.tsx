/**
 * The Korean document shell, shared by the Korean root layout and the global
 * 404 page so the two cannot drift apart: the same <html lang="ko" className={fontVariables}> and <body>
 * that app/layout.tsx had before the routes were split by language.
 */
import { fontVariables } from "./fonts";
import { GROUND_INIT } from "../lib/ground";

export default function KoreanDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the script below sets data-ground-pick on <html> before React arrives, on purpose
    <html lang="ko" className={fontVariables} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: GROUND_INIT }} /></head>
      <body>{children}</body>
    </html>
  );
}
