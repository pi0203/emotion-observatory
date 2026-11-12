"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { applyGround, DEFAULT_GROUND, GROUNDS, readGround, type Ground } from "../lib/ground";
import { useT } from "../lib/i18n/react";

/** Tells the picker when <html data-ground-pick> changes, wherever it changed. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ground-pick"] });
  return () => observer.disconnect();
}

/**
 * The paper colour picker in the homepage frame's header, beside the language link (2026-11-13).
 * A small dot shows the colour now; pressing it opens the four colours with their names, and a
 * pick applies at once. The colours are radios: arrow keys move and pick, Escape closes and
 * returns to the dot. Hidden in dark mode (--ground-ui), where there is one set only.
 */
export function GroundPick() {
  const t = useT();
  // the server draws blue; after hydration the attribute's real value takes over
  const ground = useSyncExternalStore(subscribe, readGround, () => DEFAULT_GROUND);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const radios = useRef<Record<Ground, HTMLButtonElement | null>>({ blue: null, sage: null, blush: null, lilac: null });
  const name = (g: Ground) => t(`shell.groundNames.${g}`);

  useEffect(() => {
    if (!open) return;
    radios.current[readGround()]?.focus();
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (g: Ground) => {
    applyGround(g);
    radios.current[g]?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = GROUNDS.indexOf(readGround()); // the attribute, not the state: two quick presses would read the old state
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step) {
      event.preventDefault();
      pick(GROUNDS[(at + step + GROUNDS.length) % GROUNDS.length]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    }
  };

  return <div className="ground-pick" ref={wrap}>
    <button ref={toggle} type="button" className="ground-toggle" aria-expanded={open} aria-controls="ground-list"
      aria-label={t("shell.groundNow", { name: name(ground) })} title={t("shell.groundNow", { name: name(ground) })}
      onClick={() => setOpen((was) => !was)}>
      <span className="ground-dot" data-ground={ground} aria-hidden="true" />
    </button>
    {open && <div id="ground-list" className="ground-list" role="radiogroup" aria-label={t("shell.ground")} onKeyDown={onKey}>
      <span className="ground-title" aria-hidden="true">{t("shell.ground")}</span>
      {GROUNDS.map((g) => <button key={g} ref={(el) => { radios.current[g] = el; }} type="button" role="radio" aria-checked={g === ground}
        tabIndex={g === ground ? 0 : -1} className="ground-option" onClick={() => pick(g)}>
        <span className="ground-dot" data-ground={g} aria-hidden="true" />{name(g)}
      </button>)}
    </div>}
  </div>;
}
