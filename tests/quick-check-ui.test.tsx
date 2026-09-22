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
    screen.getByRole("application", { name: /불편함과 편안함/ }),
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

  it("asks what mattered before showing any word", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "짜증" }));
    fireEvent.click(screen.getByRole("button", { name: /조금 더 정확히 살펴보기/ }));
    // the coach asks what mattered before it shows a single word
    expect(screen.getByText(/어떤 점이 가장 중요하게 느껴졌나요/)).toBeTruthy();
    for (const word of ["짜증", "억울함", "답답함"]) expect(screen.queryByRole("button", { name: word })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /잘 모르겠다/ }));

    // only now are the words offered, with escapes beside them
    expect(screen.getByRole("button", { name: "억울함" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "어느 것도 아님" })).toBeTruthy();
    expect(screen.getByLabelText("내 말로 표현하기")).toBeTruthy();
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

    // the quick reading is already placed on the pad, exactly where it was tapped
    const dot = document.querySelector(".affect-dot") as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(parseFloat(dot!.style.left)).toBeCloseTo(10, 5);
    expect(parseFloat(dot!.style.top)).toBeCloseTo(10, 5);
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
    // the four-part structure, with interpretation withheld on a thin record
    expect(screen.getByText("관찰한 것")).toBeTruthy();
    expect(screen.queryByText("연결해서 생각해볼 수 있는 것")).toBeNull();
    expect(screen.getByText(/연결해볼 만한 정보가 충분하지 않습니다/)).toBeTruthy();
    expect(screen.getByText("다음에 생각해볼 질문")).toBeTruthy();
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

  it("uses the same continuous pad for the deep pass, not a 1-5 scale", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /조금 더 천천히 살펴보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" })); // body

    expect(screen.getByText(/조금 더 살펴본 지금은 어느 쪽에 가까운가요/)).toBeTruthy();
    expect(screen.getByRole("application", { name: /불편함과 편안함/ })).toBeTruthy();
    expect(document.querySelectorAll('input[type="range"]')).toHaveLength(0);
    expect(screen.queryByText("낮음")).toBeNull();
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

    const note = "몸의 느낌은 고정된 정답이 아니라 지금 순간의 snapshot입니다. 움직임, 자세, 호흡, 시간, 상황이 달라지면 다르게 느껴질 수 있어요.";
    expect(screen.queryByText(note)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "몸이 무거움" }));
    expect(screen.getByText(note)).toBeTruthy();
    // it must never block moving on
    expect(screen.getByRole("button", { name: /다음/ })).not.toBeDisabled();
  });

  it("offers a short, collapsed reason on the landing screen", () => {
    render(<Home />);
    const why = screen.getByText("왜 감정을 조금 더 자세히 살펴볼까요?");
    expect(why.closest("details")?.hasAttribute("open")).toBe(false);
    // the claim is hedged wherever it appears
    expect(screen.getByText(/건강을 보장하지도, 정신건강을 재는 지표도 아닙니다/)).toBeTruthy();
    expect(screen.getByText(/필요한 만큼만/)).toBeTruthy();
  });

  it("opens the body step with a dozen sensations covering comfort as well as strain", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /조금 더 천천히 살펴보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));

    expect(document.querySelectorAll(".chip").length).toBeLessThanOrEqual(12);
    for (const label of ["어깨가 풀림", "몸에 온기가 돎", "에너지가 차오름"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: "다른 몸의 느낌 보기" }));
    expect(screen.getByText("호흡·가슴")).toBeTruthy();
    expect(screen.getByRole("button", { name: "숨쉬기 편함" })).toBeTruthy();
  });

  it("lets a step be undone without losing what was already entered", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /조금 더 천천히 살펴보기/ }));
    expect(screen.queryByRole("button", { name: /한 단계 뒤로/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
    fireEvent.click(screen.getByRole("button", { name: "몸이 무거움" }));
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    expect(screen.getByText(/조금 더 살펴본 지금은/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /한 단계 뒤로/ }));
    expect(screen.getByText(/몸에서는 무엇이 느껴지나요/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "몸이 무거움" }).className).toContain("selected");
  });

  it("offers directions to choose from at the end, and picks none of them", () => {
    openQuickCheck();
    tapUnpleasantActivated();
    fireEvent.click(screen.getByRole("button", { name: "긴장" }));
    fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));
    fireEvent.click(screen.getByRole("button", { name: /무엇이 필요할지 살펴보기/ }));

    expect(screen.getByText(/지금 가장 필요한 방향은 어느 쪽에 가까운가요/)).toBeTruthy();
    // nothing is preselected, nothing recommended, and no response is shown yet
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "긴장된 곳 한 군데를 조금 움직여보기" })).toBeNull();
    expect(screen.getByRole("button", { name: "좋은 경험에 조금 더 머물기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "이 좋은 상태를 만든 조건 살펴보기" })).toBeTruthy();

    // picking a direction opens its responses on the same screen
    fireEvent.click(screen.getByRole("button", { name: "몸과 마음의 속도를 조금 조절하기" }));
    expect(screen.getByText(/고르셨기 때문에/)).toBeTruthy();
    const loosen = screen.getByRole("button", { name: "긴장된 곳 한 군데를 조금 움직여보기" });
    fireEvent.click(loosen);
    expect(screen.getByRole("button", { name: "긴장된 곳 한 군데를 조금 움직여보기" }).getAttribute("aria-pressed")).toBe("true");

    // switching direction keeps the earlier choice
    fireEvent.click(screen.getByRole("button", { name: "경계나 거리를 정하기" }));
    expect(screen.queryByRole("button", { name: "긴장된 곳 한 군데를 조금 움직여보기" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "몸과 마음의 속도를 조금 조절하기" }));
    expect(screen.getByRole("button", { name: "긴장된 곳 한 군데를 조금 움직여보기" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /요약으로 돌아가기/ }));
    expect(screen.getByText(/여기까지 살펴보았습니다/)).toBeTruthy();
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
