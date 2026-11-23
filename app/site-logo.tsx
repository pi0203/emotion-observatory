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
 * or dark scheme picks one. The page draws their markup inline (app/plum-art.ts),
 * so the files themselves are not requested.
 * Decorative, so hidden from screen readers: the link's name stays the text
 * "Eunchan Joe" beside it.
 *
 * On the landing's first open of a visit the petals open one by one, 0.11 s apart (2026-11-16,
 * owner's decision 「셋 다」); that drawing is the same files' markup (app/plum-art.ts).
 */
/**
 * The same drawing with the petal wrappers taken out, so nothing in it is animated: the
 * markup of the two files in public/logo (tests/first-screen-motion.test.tsx checks that).
 */
const still = (art: string) => art.replace(/<g class="plum-petal" style="--i:\d">(<g transform="[^"]+">.*?<\/g>)<\/g>/g, "$1");
const PLUM_LIGHT_STILL = still(PLUM_LIGHT_ART);
const PLUM_DARK_STILL = still(PLUM_DARK_ART);

export function SiteLogo({ bloom = false }: { bloom?: boolean }) {
  // first screen, first open of the visit: the petals open one by one (app/globals.css
  // .plum-petal). Any other time the drawing is still. Either way it is inline, both colour
  // sets inside and the page's scheme showing one, so coming back to the first screen asks
  // the server for nothing (2026-11-20: the image files were fetched then, and with no
  // connection the mark was empty).
  const [opening] = useState(() => bloom && firstOpenPending());
  return (
    <span className={opening ? "site-logo-mark plum-bloom" : "site-logo-mark"} aria-hidden="true">
      <svg className="plum-light" viewBox={PLUM_LIGHT_BOX} xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: opening ? PLUM_LIGHT_ART : PLUM_LIGHT_STILL }} />
      <svg className="plum-dark" viewBox={PLUM_DARK_BOX} xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: opening ? PLUM_DARK_ART : PLUM_DARK_STILL }} />
    </span>
  );
}
