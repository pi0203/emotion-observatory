import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GroundPick } from "../app/ground-pick";
import { GROUND_INIT, GROUND_KEY } from "../lib/ground";

/** The visitor's paper colour (2026-11-13): four sets, picked from a dot in the header, kept in this browser. */
describe("paper colour picker", () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.groundPick;
    localStorage.clear();
  });

  it("opens four named colours from one dot and applies a pick at once", async () => {
    render(<GroundPick />);
    const toggle = screen.getByRole("button", { name: "바탕색: 파랑" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["파랑", "세이지", "블러시", "연보라"]);
    expect(screen.getByRole("radio", { name: "파랑" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "블러시" }));
    expect(document.documentElement.dataset.groundPick).toBe("blush");
    expect(localStorage.getItem(GROUND_KEY)).toBe("blush");
    // the names follow <html data-ground-pick> through a MutationObserver, which reports after this tick
    await waitFor(() => expect(screen.getByRole("radio", { name: "블러시" })).toHaveAttribute("aria-checked", "true"));
    expect(toggle).toHaveAccessibleName("바탕색: 블러시");
  });

  it("moves with the arrow keys and closes on Escape, back on the dot", async () => {
    render(<GroundPick />);
    const toggle = screen.getByRole("button", { name: "바탕색: 파랑" });
    fireEvent.click(toggle);
    const group = screen.getByRole("radiogroup", { name: "바탕색" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(document.documentElement.dataset.groundPick).toBe("sage");
    expect(screen.getByRole("radio", { name: "세이지" })).toHaveFocus();
    await waitFor(() => expect(screen.getByRole("radio", { name: "세이지" })).toHaveAttribute("aria-checked", "true"));
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByRole("radio", { name: "파랑" })).toHaveAttribute("aria-checked", "true"));
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(document.documentElement.dataset.groundPick).toBe("lilac");
    fireEvent.keyDown(group, { key: "Escape" });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it("goes back to blue with no attribute and nothing stored", () => {
    render(<GroundPick />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("radio", { name: "연보라" }));
    fireEvent.click(screen.getByRole("radio", { name: "파랑" }));
    expect(document.documentElement.dataset.groundPick).toBeUndefined();
    expect(localStorage.getItem(GROUND_KEY)).toBeNull();
  });

  it("sets the stored pick before the first paint, and ignores anything else", () => {
    localStorage.setItem(GROUND_KEY, "sage");
    new Function(GROUND_INIT)();
    expect(document.documentElement.dataset.groundPick).toBe("sage");
    delete document.documentElement.dataset.groundPick;
    localStorage.setItem(GROUND_KEY, "red");
    new Function(GROUND_INIT)();
    expect(document.documentElement.dataset.groundPick).toBeUndefined();
  });
});
