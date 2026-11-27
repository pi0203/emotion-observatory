import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { createSession, sessionReducer, type EmotionSession } from "../lib/session-types";
import { loadCompleted, saveCompleted } from "../lib/storage";
import { revealWords, startDeep, startQuick } from "./helpers/start";

/**
 * One record from 이쯤 to the sentence to say, without a stop (2026-11-27, 깊게 볼 것 「다」):
 * 건너뛰기 keeps nothing picked on its step, the 「한 문장으로 적기」 choices open a place
 * to write, one record can be deleted after one question, and the 「머물러 느끼는」 line
 * is not said on a record read as 불쾌함 쪽.
 */
const skip = () => fireEvent.click(screen.getAllByRole("button", { name: ko.common.skip })[0]);

const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

/** Pad at `clientX`, 가까운 말이 없음, 여기까지, then 지금 필요한 것. */
const toNeeds = (clientX: number) => {
  render(<Home />);
  startQuick();
  fireEvent(screen.getByRole("application", { name: /불쾌함과 유쾌함/ }), new MouseEvent("pointerdown", { bubbles: true, clientX, clientY: 150 }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
  fireEvent.click(screen.getByRole("button", { name: "가까운 말이 없음" }));
  fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));
  fireEvent.click(screen.getByRole("button", { name: ko.quickSummary.support }));
};

const finished = (id: string): EmotionSession => {
  let state = sessionReducer({ ...createSession(), id }, { type: "START_QUICK" });
  state = sessionReducer({ ...state, id }, { type: "SET_QUICK_AFFECT", affect: { valence: 0.7, activation: 0.4 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "편안함", source: "suggested" }] });
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "편안함" });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

describe("one record, start to finish", () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubGridSize();
  });
  afterEach(cleanup);

  it("건너뛰기 keeps nothing picked on its step", () => {
    render(<Home />);
    startDeep();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(ko.entry.observe) }));
    fireEvent.click(document.querySelector<HTMLButtonElement>(".chip-grid button")!); // body
    skip();
    skip(); // affect
    fireEvent.change(document.querySelector("textarea.text-area")!, { target: { value: "회의에서 말이 끊겼다" } });
    skip(); // context
    fireEvent.click(document.querySelector<HTMLButtonElement>(".choice-list button")!); // meaning
    skip();
    revealWords();
    fireEvent.click(document.querySelector<HTMLButtonElement>(".chip-grid .chip")!); // a word
    skip();
    fireEvent.click(document.querySelector<HTMLButtonElement>(".choice-list button")!); // clarity only
    skip();
    const deep = loadCompleted()[0].deepReflection!;
    expect(deep.body).toEqual([]);
    expect(deep.affect).toEqual({});
    expect(deep.context?.eventText).toBeUndefined();
    expect(deep.concerns).toEqual([]);
    expect(deep.emotionCandidates).toEqual([]);
    expect(deep.outcome).toBeUndefined();
    expect(loadCompleted()[0].status).toBe("completed");
  });

  it("opens a place to write under each 「한 문장으로 적기」 choice while it is picked", () => {
    toNeeds(360);
    fireEvent.click(screen.getByRole("button", { name: /누군가에게 표현할 준비하기/ }));
    const choice = "전하고 싶은 핵심을 한 문장으로 적기";
    expect(screen.queryByRole("textbox", { name: choice })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(choice) }));
    const field = screen.getByRole("textbox", { name: choice });
    fireEvent.change(field, { target: { value: "다음 회의 때 끝까지 말하고 싶어" } });
    expect(screen.getByText(ko.sayIt.notSent)).toBeTruthy();
    // nothing typed there goes into the record
    expect(JSON.stringify(window.localStorage)).not.toContain("끝까지 말하고 싶어");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(choice) }));
    expect(screen.queryByRole("textbox", { name: choice })).toBeNull();
    for (const [need, label] of [["다른 사람의 도움을 구하기", "무엇을 부탁할지 한 문장으로 적기"], ["경계나 거리를 정하기", "전달할 말을 한 문장으로 적기"]]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(need) }));
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
      expect(screen.getByRole("textbox", { name: label })).toBeTruthy();
    }
  });

  it("does not say the 「머물러 느끼는」 line on the unpleasant side", () => {
    toNeeds(40);
    expect(screen.getByText(ko.need.varies)).toBeTruthy();
    expect(screen.queryByText(new RegExp(ko.need.variesGood))).toBeNull();
    cleanup();
    window.localStorage.clear();
    toNeeds(360);
    expect(screen.getByText(`${ko.need.varies} ${ko.need.variesGood}`)).toBeTruthy();
  });

  it("deletes one record after asking once, and keeps the others", () => {
    saveCompleted(finished("keep-me"));
    saveCompleted(finished("delete-me"));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "지난 기록" }));
    fireEvent.click(document.querySelector<HTMLButtonElement>("#record-delete-me")!);
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.deleteOne }));
    expect(screen.getByText(ko.recordDetail.deleteOneConfirmTitle)).toBeTruthy();
    expect(screen.getByText(ko.recordDetail.deleteOneConfirmBody)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.deleteOneCancel }));
    expect(loadCompleted()).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.deleteOne }));
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.deleteOneConfirm }));
    expect(loadCompleted().map((item) => item.id)).toEqual(["keep-me"]);
    expect(document.querySelector("#record-delete-me")).toBeNull();
    expect(document.querySelector("#record-keep-me")).toBeTruthy();
  });
});
