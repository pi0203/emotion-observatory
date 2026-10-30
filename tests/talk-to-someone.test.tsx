import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { getStorageAdapter } from "../lib/storage-adapter";
import { startQuick, startDeep } from "./helpers/start";
import { ko } from "../lib/i18n/messages.ko";

const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};
const QUESTION = "이 경험을 사람에게 말해 볼 생각이 있나요?";

const toDeepSummary = () => {
  render(<Home />);
  startDeep();
  fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getAllByRole("button", { name: "건너뛰기" })[0]); // body, affect, context, meaning, words
  fireEvent.click(screen.getByRole("button", { name: "조금 더 분명해짐" }));
  fireEvent.click(screen.getByRole("button", { name: "도움됨" }));
  fireEvent.click(screen.getByRole("button", { name: /다음/ }));
};

describe("the one question about telling a person", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); });
  afterEach(cleanup);

  it("asks it on the slower look's closing screen, with no answer chosen", () => {
    toDeepSummary();
    expect(screen.getByRole("heading", { level: 2, name: QUESTION })).toBeInTheDocument();
    for (const name of ["예", "아니오", "아직"]) expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the answer with the record, lets it change, and stays on the same screen", () => {
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: "아직" }));
    expect(screen.getByRole("heading", { level: 1, name: "여기까지 살펴보았습니다." })).toBeInTheDocument();
    expect(getStorageAdapter().loadCompleted()[0].talkToSomeone?.answer).toBe("not-yet");
    fireEvent.click(screen.getByRole("button", { name: "예" }));
    expect(screen.getByRole("button", { name: "예" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "아직" })).toHaveAttribute("aria-pressed", "false");
    expect(getStorageAdapter().loadCompleted()[0].talkToSomeone?.answer).toBe("yes");
  });

  it("is not asked on the quick look, which stays short", () => {
    render(<Home />);
    startQuick();
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠다" }));
    expect(screen.getByRole("heading", { level: 1, name: "여기까지 살펴보았습니다." })).toBeInTheDocument();
    expect(screen.queryByText(QUESTION)).toBeNull();
  });

  it("shows the answer as it was given in the record, with no tally anywhere", () => {
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: "아니오" }));
    cleanup();
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row button, button.record-row, .record-row") as HTMLElement);
    expect(screen.getByText("사람에게 말해 볼 생각")).toBeInTheDocument();
    expect(screen.getByText("아니오")).toBeInTheDocument();
  });
});
