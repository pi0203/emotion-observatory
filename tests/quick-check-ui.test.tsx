import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/page";

// jsdom reports a zero-sized box, which would make the affect tap produce NaN.
const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

const openQuickCheck = () => {
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /빠르게 살펴보기/ }));
};

const tapUnpleasantActivated = () => {
  // jsdom drops clientX/clientY from PointerEvent, so dispatch a MouseEvent named "pointerdown".
  fireEvent(
    screen.getByRole("button", { name: /불편함과 편안함/ }),
    new MouseEvent("pointerdown", { bubbles: true, clientX: 40, clientY: 30 }),
  );
  fireEvent.click(screen.getByRole("button", { name: /다음/ }));
};

describe("quick check screens", () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubGridSize();
  });
  afterEach(cleanup);

  it("shows no progress indicator, so a 10-30 second check does not look like a course to finish", () => {
    openQuickCheck();
    expect(screen.queryByLabelText(/진행/)).toBeNull();
    tapUnpleasantActivated();
    expect(screen.queryByLabelText(/진행/)).toBeNull();
  });

  it("does not choose a word for the user who answers 잘 모르겠음 in the coach", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "긴장" }));
    fireEvent.click(screen.getByRole("button", { name: /조금 더 정확히 살펴보기/ }));
    fireEvent.click(screen.getByRole("button", { name: "잘 모르겠음" }));

    expect(screen.queryByRole("heading", { name: /어느 쪽이 지금 경험과 조금 더 가까운가요/ })).toBeNull();
    expect(screen.getByText(/여기까지 살펴보았습니다/)).toBeTruthy();
  });

  it("carries the quick reading into the deep affect step as an editable suggestion", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "긴장" }));
    fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));
    fireEvent.click(screen.getByRole("button", { name: /조금 더 천천히 들여다보기/ }));

    // the reopened session lands on the entry gate, then the deep flow
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect((screen.getByLabelText("불쾌함에서 유쾌함") as HTMLInputElement).value).toBe("1");
    expect((screen.getByLabelText("가라앉음에서 활성됨") as HTMLInputElement).value).toBe("5");
  });

  it("shows a handful of words first and reveals related ones only when asked", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    const firstTier = screen.getAllByRole("button", { name: /^(긴장|초조함|짜증|억울함|답답함)$/ });
    expect(firstTier.length).toBeLessThanOrEqual(5);
    expect(screen.queryByText("비슷한 표현")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "비슷한 표현 더 보기" }));
    expect(screen.getByText("비슷한 표현")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "비슷한 표현 더 보기" })).toBeNull();
  });

  it("lets the user add their own word at the last tier", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "비슷한 표현 더 보기" }));
    fireEvent.click(screen.getByRole("button", { name: /다른 표현 찾아보기/ }));

    const input = screen.getByLabelText("내 말로 적기");
    fireEvent.change(input, { target: { value: "뒤통수 맞은 느낌" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByText("내가 적은 말")).toBeTruthy();
    expect(screen.getByRole("button", { name: "뒤통수 맞은 느낌" })).toBeTruthy();
  });

  it("offers a synthesis of the user's own entries on the summary, with a fit rating", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "긴장" }));
    fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));

    expect(screen.getByText(/지금까지의 경험을/)).toBeTruthy();
    expect(screen.getByText(/당신이 고른 내용을 연결하면/)).toBeTruthy();
    expect(screen.getByText(/이 설명이 지금 경험과 얼마나 맞나요/)).toBeTruthy();

    const partly = screen.getByRole("button", { name: "일부만 맞아요" });
    expect(partly.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(partly);
    expect(screen.getByRole("button", { name: "일부만 맞아요" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the rewrite box out of the way until it is asked for", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "긴장" }));
    fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));

    expect(screen.queryByLabelText("내 말로 고쳐보기")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "내 말로 고쳐보기" }));
    fireEvent.change(screen.getByLabelText("내 말로 고쳐보기"), { target: { value: "사실은 그냥 지쳤던 것 같다" } });
    fireEvent.click(screen.getByRole("button", { name: "이 기록에 남기기" }));

    expect(screen.getByText(/사실은 그냥 지쳤던 것 같다/)).toBeTruthy();
  });

  it("does not put the whole vocabulary on the deep emotion step either", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /조금 더 천천히 살펴보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" })); // body
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));     // affect
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" })); // context
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" })); // meaning

    expect(screen.getByText(/가까운 단어가 있나요/)).toBeTruthy();
    const chips = document.querySelectorAll(".chip");
    expect(chips.length).toBeLessThanOrEqual(5);
    expect(screen.getByRole("button", { name: "비슷한 표현 더 보기" })).toBeTruthy();
  });

  it("holds the step rationale back until the user has chosen something", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /조금 더 천천히 살펴보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));

    const note = "몸의 느낌은 감정의 정답은 아니지만, 지금 경험을 이해하는 하나의 단서가 될 수 있어요.";
    expect(screen.queryByText(note)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "몸이 무거움" }));
    expect(screen.getByText(note)).toBeTruthy();
    // it must never block moving on
    expect(screen.getByRole("button", { name: /다음/ })).not.toBeDisabled();
  });

  it("keeps 가까운 말이 없음 and 잘 모르겠음 as separate recorded answers on the summary", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "가까운 말이 없음" }));
    fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));
    expect(screen.getByText("가까운 말이 없음")).toBeTruthy();

    cleanup();
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "잘 모르겠음" }));
    fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));
    expect(screen.getByText("잘 모르겠음")).toBeTruthy();
  });
});
