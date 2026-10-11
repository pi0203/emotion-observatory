import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import LoginPrototype from "../app/proto/login/LoginPrototype";
import LoginPrototypePage from "../app/proto/login/page";

const FORBIDDEN = [/안전하게/, /안심/, /사탕/, /쿠폰/, /친구/, /초대/, /서두르/, /지금 바로/, /마감/, /남았/, /한정/];
const EMOJI = /\p{Extended_Pictographic}/u;

const shown = () => document.body.textContent ?? "";
const openDialog = (label: string) => {
  const opener = screen.getByRole("button", { name: label });
  opener.focus();
  fireEvent.click(opener);
  return { opener, dialog: screen.getByRole("dialog") };
};

/** Every state the mock-up can show, so the copy checks see all of it. */
const visitEveryState = () => {
  const texts: string[] = [shown()];
  for (const length of ["짧게", "자세히"]) {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${length}`) }));
    const { dialog } = openDialog("로그인 전 창 열기");
    texts.push(shown());
    fireEvent.click(within(dialog).getByRole("button", { name: "Google 계정으로 계속하기" }));
    texts.push(shown());
    fireEvent.click(within(dialog).getByRole("button", { name: "지금은 하지 않기" }));
  }
  let { dialog } = openDialog("내 이용 기록 창 열기");
  texts.push(shown());
  fireEvent.click(within(dialog).getByRole("button", { name: "내 이용 기록 모두 지우기" }));
  texts.push(shown());
  fireEvent.click(within(dialog).getByRole("button", { name: "모두 지우기" }));
  texts.push(shown());
  fireEvent.click(within(dialog).getByRole("button", { name: "로그아웃" }));
  texts.push(shown());
  ({ dialog } = openDialog("로그인 취소 상태 열기"));
  texts.push(shown());
  fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
  return texts.join("\n");
};

describe("login mock-up copy", () => {
  afterEach(cleanup);

  it("(a) has no reassurance, reward, invitation, urgency or emoji in any state", () => {
    render(<LoginPrototype />);
    const all = visitEveryState();
    for (const pattern of FORBIDDEN) expect(all).not.toMatch(pattern);
    expect(all).not.toMatch(EMOJI);
    expect(document.querySelectorAll("input[type=checkbox]")).toHaveLength(0);
  });

  it("(b) says the app works without logging in, offers to decline, and labels the example", () => {
    render(<LoginPrototype />);
    let { dialog } = openDialog("로그인 전 창 열기");
    expect(within(dialog).getByText("로그인하지 않아도 모든 기능을 똑같이 쓸 수 있습니다.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "지금은 하지 않기" })).toBeTruthy();
    expect(within(dialog).getByText(/Google이 이 계정으로 이 앱에 로그인했다는 사실을 알게 됩니다/)).toBeTruthy();
    expect(within(dialog).getByText(/서버로 보내지 않습니다/)).toBeTruthy();
    expect(within(dialog).getAllByText("아직 정해지지 않음")).toHaveLength(3);
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    ({ dialog } = openDialog("내 이용 기록 창 열기"));
    expect(within(dialog).getByText("예시입니다")).toBeTruthy();
    expect(within(dialog).getByRole("table")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "내 이용 기록 모두 지우기" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "로그아웃" })).toBeTruthy();
  });

  it("the main button only says this is a mock-up", () => {
    render(<LoginPrototype />);
    const { dialog } = openDialog("로그인 전 창 열기");
    fireEvent.click(within(dialog).getByRole("button", { name: "Google 계정으로 계속하기" }));
    expect(within(dialog).getByRole("status").textContent).toMatch(/시안입니다. 실제 로그인은 일어나지 않았/);
  });

  it("the cancelled state is one line and a way out", () => {
    render(<LoginPrototype />);
    const { dialog } = openDialog("로그인 취소 상태 열기");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("로그인하지 않았습니다. 앱은 그대로 쓸 수 있습니다.");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeTruthy();
  });
});

describe("login mock-up window behaviour", () => {
  afterEach(cleanup);

  it("(c) every window is a modal dialog named by its title", () => {
    render(<LoginPrototype />);
    for (const [label, title] of [["로그인 전 창 열기", "수업 참여 기록 남기기(선택)"], ["내 이용 기록 창 열기", "내 이용 기록"]] as const) {
      const { dialog } = openDialog(label);
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(screen.getByRole("dialog", { name: title })).toBe(dialog);
      fireEvent.keyDown(dialog, { key: "Escape" });
    }
  });

  it("(d) Esc closes the window and focus returns to the button that opened it", () => {
    render(<LoginPrototype />);
    for (const label of ["로그인 전 창 열기", "내 이용 기록 창 열기", "로그인 취소 상태 열기"]) {
      const { opener, dialog } = openDialog(label);
      expect(dialog.contains(document.activeElement)).toBe(true);
      fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(opener);
    }
  });

  it("keeps Tab inside the window", () => {
    render(<LoginPrototype />);
    const { dialog } = openDialog("로그인 전 창 열기");
    const buttons = within(dialog).getAllByRole("button");
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(last);
    const first = dialog.querySelector<HTMLElement>("button, summary")!;
    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("hides the page behind the window from screen readers and from focus", () => {
    render(<LoginPrototype />);
    openDialog("로그인 전 창 열기");
    const behind = screen.getByText("로그인 창 모양 시안").closest("[inert]");
    expect(behind).not.toBeNull();
    expect(behind!.getAttribute("aria-hidden")).toBe("true");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("marks the chosen copy length with words, not only colour", () => {
    render(<LoginPrototype />);
    const long = screen.getByRole("button", { name: /^자세히/ });
    fireEvent.click(long);
    expect(long.getAttribute("aria-pressed")).toBe("true");
    expect(long.textContent).toMatch(/선택됨/);
  });
});

describe("login mock-up sends and stores nothing", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("(e) calls neither fetch nor XMLHttpRequest, and writes no storage or cookie", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, "open");
    const xhrSend = vi.spyOn(XMLHttpRequest.prototype, "send");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const cookieBefore = document.cookie;

    render(<LoginPrototype />);
    visitEveryState();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(xhrSend).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe(cookieBefore);
  });
});

describe("login mock-up route", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders the 404 page in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => LoginPrototypePage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("stays open in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(LoginPrototypePage());
    expect(screen.getByRole("heading", { level: 1, name: "로그인 창 모양 시안" })).toBeTruthy();
  });
});
