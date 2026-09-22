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
