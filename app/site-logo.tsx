"use client";

import { useState } from "react";
import { firstOpenPending } from "./first-open";
import { PLUM_DARK_ART, PLUM_DARK_BOX, PLUM_LIGHT_ART, PLUM_LIGHT_BOX } from "./plum-art";

/*
 * Site logo: the plum blossom (오얏꽃), five overlapping petals in five pastels
 * with a gold rim and stamens, the homepage's logo (owner's choice 「가」,
 * 2026-11-05; drawing by Aside). The two files in public/logo are the
 * originals `가_머리줄_밝은.svg` and `가_머리줄_어두운.svg`, unchanged
 * (paths, colours and stroke widths are not to be changed); the page's light
 * or dark scheme picks one.
 * Decorative, so hidden from screen readers: the link's name stays the text
 * "Eunchan Joe" beside it.
 *
 * On the landing's first open of a visit the petals open one by one, 0.11 s apart (2026-11-16,
 * owner's decision 「셋 다」); that drawing is the same files' markup (app/plum-art.ts).
 */
export function SiteLogo({ bloom = false }: { bloom?: boolean }) {
  // first screen, first open of the visit: the same drawing inline, petals opening one by
  // one (app/globals.css .plum-bloom); both colour sets are inside, the page's scheme shows one
  const [opening] = useState(() => bloom && firstOpenPending());
  if (opening) return (
    <span className="site-logo-mark plum-bloom" aria-hidden="true">
      <svg className="plum-light" viewBox={PLUM_LIGHT_BOX} xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: PLUM_LIGHT_ART }} />
      <svg className="plum-dark" viewBox={PLUM_DARK_BOX} xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: PLUM_DARK_ART }} />
    </span>
  );
  return (
    <picture className="site-logo-mark" aria-hidden="true">
      <source srcSet="/logo/plum-header-dark.svg" media="(prefers-color-scheme: dark)" />
      <img src="/logo/plum-header-light.svg" alt="" width={46} height={46} />
    </picture>
  );
}
