"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./save-island.module.css";

/**
 * The two "saved" notes under the closing questions (talkToSomeone, underlyingFeeling)
 * grow out of a small pill when the person picks or changes an answer: sideways first,
 * then down into place (2026-11-16). The springs keep the stiffness and damping of
 * DesignBookmark's Morph island (width 380/24, height 300/22, unit mass); the code is
 * written here, not copied. Nothing moves on its own: a note already there when the
 * screen opens is shown as it is, and the motion stops once both springs settle.
 * With reduced motion turned on, or no layout to measure, the note just appears.
 * The save-failed warning does not use this: it is shown at once.
 */
const WIDTH_SPRING = { k: 380, c: 24 };
const HEIGHT_SPRING = { k: 300, c: 22 };
const PILL = { width: 126, height: 36 };
const MAX_RADIUS = 12; // the site's button corner, in place of the pill's 32
const MIN_HEIGHT = 20;
const SETTLED = 0.5;

type Spring = { x: number; v: number; t: number; k: number; c: number };

/** One semi-implicit Euler step: the frame is capped at 1/30 s and split in four. */
function stepSpring(s: Spring, dt: number) {
  const h = dt / 4;
  for (let i = 0; i < 4; i++) {
    s.v += (-s.k * (s.x - s.t) - s.c * s.v) * h;
    s.x += s.v * h;
  }
}

const settled = (s: Spring) => Math.abs(s.x - s.t) < SETTLED && Math.abs(s.v) < SETTLED;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

const reducedMotion = () => typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SaveIsland({ show, replay, children }: { show: boolean; replay?: string; children: ReactNode }) {
  const box = useRef<HTMLParagraphElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const first = useRef(replay);

  useLayoutEffect(() => {
    if (replay === first.current) return;
    first.current = replay;
    const el = box.current;
    const inner = text.current;
    if (!el || !inner || reducedMotion() || typeof window.requestAnimationFrame !== "function") return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (!width || !height) return;

    const innerWidth = inner.offsetWidth;
    const W: Spring = { x: Math.min(PILL.width, width), v: 0, t: width, ...WIDTH_SPRING };
    const H: Spring = { x: Math.min(PILL.height, height), v: 0, t: height, ...HEIGHT_SPRING };
    const startWidth = W.x;
    let last = performance.now();
    let frame = 0;

    const clear = () => {
      el.style.width = el.style.height = el.style.borderRadius = el.style.overflow = "";
      inner.style.width = inner.style.opacity = "";
    };
    const render = () => {
      const h = Math.max(H.x, MIN_HEIGHT);
      // while the height moves fast the width gives back a little, at most 5%
      const give = clamp(-H.v / 7000, -0.05, 0.05);
      el.style.width = `${W.x * (1 + give)}px`;
      el.style.height = `${h}px`;
      el.style.borderRadius = `${Math.min(h / 2, MAX_RADIUS)}px`;
      inner.style.opacity = String(width > startWidth ? clamp((W.x - startWidth) / (width - startWidth), 0, 1) : 1);
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      stepSpring(W, dt);
      stepSpring(H, dt);
      if (settled(W) && settled(H)) { clear(); return; }
      render();
      frame = requestAnimationFrame(tick);
    };

    el.style.overflow = "hidden";
    inner.style.width = `${innerWidth}px`;
    render();
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clear(); };
  }, [replay]);

  if (!show) return null;
  return <p ref={box} className={`small-note ${styles.island}`} role="status"><span ref={text} className={styles.text}>{children}</span></p>;
}
