import { fireEvent, screen } from "@testing-library/react";
import { ko } from "../../lib/i18n/messages.ko";

/**
 * The landing has one way in, 지금 기록, which opens the quick look (2026-10-30).
 * The slower look is reached from inside it: a spot on the pad (the keyboard
 * puts it in the middle, since jsdom gives the pad no size), then 다음, then
 * 조금 더 천천히 들여다보기 at the end of the second step, which leads to the gate.
 */
export const startQuick = () => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.landing.start}`) }));

export const startDeep = () => {
  startQuick();
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
  fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.deep }));
};

/** The word steps draw no offered word until 단어 보기 is pressed (2026-10-30). */
export const revealWords = () => fireEvent.click(screen.getByRole("button", { name: ko.words.reveal }));
