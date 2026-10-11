/**
 * The Korean document shell, shared by the Korean root layout and the global
 * 404 page so the two cannot drift apart: the same <html lang="ko"> and <body>
 * that app/layout.tsx had before the routes were split by language.
 */
export default function KoreanDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
