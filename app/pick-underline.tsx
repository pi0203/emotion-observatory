"use client";

/**
 * 바탕: Kokonut UI Marker text (MIT)
 * @author: @dorianbaffier
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 *
 * The 3px coral line under a picked emotion word (2026-11-16, owner's decision 「구현」):
 * when the person picks the word, the line is drawn once from left to right. The pen's
 * pace and easing are Marker text's (0.9px per ms, at least 260ms, the same cubic-bezier);
 * its longest stroke is cut from 820ms to 500ms so the line lands within half a second.
 * The code is written here with plain CSS and React, not copied, and draws the site's
 * straight line, not a hand-drawn one.
 *
 * Nothing moves on its own: a word already picked when the screen opens shows its line
 * as it is. With reduced motion turned on, the line is there at once.
 */
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./pick-underline.module.css";

const PEN_SPEED = 0.9; // px per ms
const MIN_MS = 260;
const MAX_MS = 500; // Marker text allows 820; the site's rule is half a second

export const pickHost = styles.host;

export function PickUnderline({ on }: { on: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [draw, setDraw] = useState(false);
  const before = useRef(on); // picked before this screen opened: no drawing

  useLayoutEffect(() => {
    if (on && !before.current) setDraw(true);
    if (!on) setDraw(false);
    before.current = on;
  }, [on]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !draw) return;
    const width = el.getBoundingClientRect().width;
    el.style.animationDuration = `${Math.min(MAX_MS, Math.max(MIN_MS, width / PEN_SPEED))}ms`;
  }, [draw]);

  if (!on) return null;
  return <span ref={ref} className={`${styles.line} ${draw ? styles.draw : ""}`} aria-hidden="true" data-pick-line={draw ? "draw" : "still"} onAnimationEnd={() => setDraw(false)} />;
}
