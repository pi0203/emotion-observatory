/*
 * Site logo: the plum blossom (오얏꽃), five overlapping petals in five pastels
 * with a gold rim and stamens, the homepage's logo (owner's choice 「가」,
 * 2026-11-05; drawing by Aside). The two files in public/logo are the
 * originals `가_머리줄_밝은.svg` and `가_머리줄_어두운.svg`, unchanged
 * (paths, colours and stroke widths are not to be changed); the page's light
 * or dark scheme picks one.
 * Decorative, so hidden from screen readers: the link's name stays the text
 * "Eunchan Joe" beside it.
 */
export function SiteLogo() {
  return (
    <picture className="site-logo-mark" aria-hidden="true">
      <source srcSet="/logo/plum-header-dark.svg" media="(prefers-color-scheme: dark)" />
      <img src="/logo/plum-header-light.svg" alt="" width={46} height={46} />
    </picture>
  );
}
