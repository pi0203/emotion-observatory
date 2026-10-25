import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";

/** docs/KNOWLEDGE_DURABILITY.md §2 A: every study card says when it was last looked at again. */
describe("the studies on the landing carry the day they were last checked", () => {
  afterEach(cleanup);

  it("shows one checked date per study and a last-checked line", () => {
    const { container } = render(<Home />);
    const cards = container.querySelectorAll(".about-list li .about-cite");
    const dates = container.querySelectorAll(".about-list li .about-checked");
    expect(cards.length).toBe(6);
    expect(dates.length).toBe(cards.length);
    for (const date of dates) expect(date.textContent).toMatch(/^확인 \d{4}\. \d{2}\. \d{2}\.$/);
    expect(screen.getByText(/^마지막 확인 \d{4}\. \d{2}\. \d{2}\./)).toBeInTheDocument();
  });
});
