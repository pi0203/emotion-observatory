/*
 * Site logo: five books seen from above, one small wildflower (the owner's
 * choice for the homepage, 2026-11-03; drawing by Aside). Copied from the
 * homepage's components/site-logo.tsx, whose source is `로고_머리줄용.svg`.
 * Paths, colours and stroke widths are not to be changed.
 * Decorative, so hidden from screen readers: the link's name stays the text
 * "Eunchan Joe" beside it.
 */
const PETAL = "M0 0C-9-3-11-15-4-19C-2-20.5-.8-19.5 0-17.5C.8-19.5 2-20.5 4-19C11-15 9-3 0 0Z";

export function SiteLogo() {
  return (
    <svg className="site-logo-mark" viewBox="-23 -23 46 46" aria-hidden="true" focusable="false">
      <g transform="translate(0 0) rotate(-10) scale(1)">
        {[0, 72, 144, 216, 288].map((r) => (
          <g key={r} transform={`rotate(${r})`}>
            <path d={PETAL} fill="#fbfaf3" stroke="#55744f" strokeWidth="1.60" strokeLinejoin="round" />
            <line x1="0" y1="-4" x2="0" y2="-16.5" stroke="#3f5a42" strokeWidth="0.70" strokeLinecap="round" opacity=".7" />
          </g>
        ))}
      </g>
      <circle cx="0" cy="0" r="3.40" fill="#3f5a42" />
      <circle cx="0" cy="0" r="1.60" fill="#c9a24a" />
    </svg>
  );
}
