import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { startQuick, startDeep } from "./helpers/start";

const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

describe("the helplines are one tap away on every step (SAFETY.md)", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); });
  afterEach(cleanup);

  it("offers the help line on the first quick step and opens the same crisis card", () => {
    render(<Home />);
    startQuick();
    fireEvent.click(screen.getByRole("button", { name: "도움받을 수 있는 곳" }));
    const dialog = screen.getByRole("dialog", { name: "긴급 지원 및 위기 상담 안내" });
    for (const number of ["109", "1577-0199", "1388"]) expect(within(dialog).getByText(number)).toBeInTheDocument();
    expect(within(dialog).getByText(/119/)).toBeInTheDocument();
  });

  it("closes with Escape or the close button and leaves the step as it was", () => {
    render(<Home />);
    startQuick();
    const pad = screen.getByRole("application", { name: /불쾌함과 유쾌함/ });
    fireEvent.click(screen.getByRole("button", { name: "도움받을 수 있는 곳" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "도움받을 수 있는 곳" }));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("application", { name: /불쾌함과 유쾌함/ })).toBe(pad);
  });

  it("is present on the deep steps too", () => {
    render(<Home />);
    startDeep();
    expect(screen.getByRole("button", { name: "도움받을 수 있는 곳" })).toBeInTheDocument();
  });
});

describe("other people in what I write", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); });
  afterEach(cleanup);

  it("tells the person they may replace names, under the what-happened box", () => {
    render(<Home />);
    startDeep();
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ })); // entry gate
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));                 // body
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));                 // affect
    expect(screen.getByText("무슨 일이 있었나요?")).toBeInTheDocument();
    expect(screen.getByText(/다른 사람의 이름은 ‘친구’, ‘팀장’처럼 바꿔 적어도 됩니다/)).toBeInTheDocument();
  });

  it("answers whether the maker can see the records, including the hosting logs", () => {
    render(<Home />);
    expect(screen.getByText("만든 사람이 내 기록을 볼 수 있나요?")).toBeInTheDocument();
    expect(screen.getByText(/호스팅 업체\(Vercel\)/)).toBeInTheDocument();
  });
});
