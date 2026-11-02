import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Privacy, { metadata } from "../app/(ko)/privacy/page";
import Terms from "../app/(ko)/terms/page";
import Home from "../app/(ko)/page";
import EmotionApp from "../app/emotion-app";
import sitemap from "../app/sitemap";
import privacy from "../data/privacy.ko.json";
import { koOnly } from "../lib/i18n/messages.ko";
import { SITE_URL } from "../lib/site";
import { PRIVACY_PATH, TERMS_PATH } from "../lib/terms";

/** /privacy, the privacy policy taken as written (owner's decision 2026-11-02), in the frame of /terms. */
afterEach(cleanup);

describe("/privacy", () => {
  it("draws the heading, the not-yet-open sentence in bold first, and every section", () => {
    render(<Privacy />);
    const main = screen.getByRole("main");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("개인정보 처리방침");
    const lead = within(main).getByText("아직 로그인 기능은 열리지 않았습니다.");
    expect(lead.tagName).toBe("STRONG");
    expect(main.querySelector(".terms-intro")?.textContent).toMatch(/^아직 로그인 기능은 열리지 않았습니다\. 지금은 개인정보를 받지 않고/);
    const titles = within(main).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles).toEqual([...Array.from({ length: 12 }, (_, i) => expect.stringMatching(new RegExp(`^${i + 1}\\. `))), "바뀐 내용"]);
    expect(main.textContent).toContain("2026-11-02: 처음 씀. 로그인 기능을 열기 전이라 아직 적용하지 않음.");
    expect(main.textContent).toContain("만 14세 미만은 로그인 기능을 쓸 수 없습니다.");
    expect(main.querySelector("a")?.getAttribute("href")).toBe("/");
  });

  it("is titled like /terms: 「개인정보 처리방침 · 감정 관찰실 · Emotion Observatory」", () => {
    expect(metadata.title).toBe("개인정보 처리방침 · 감정 관찰실 · Emotion Observatory");
    expect(metadata.alternates).toEqual({ canonical: PRIVACY_PATH });
    expect(metadata.openGraph).toMatchObject({ url: PRIVACY_PATH, title: metadata.title });
    expect(metadata.twitter).toMatchObject({ title: metadata.title });
  });

  it("keeps its text as plain text: only <b> is a mark", () => {
    const all = JSON.stringify([privacy.intro, privacy.sections, privacy.changes]);
    expect(all).not.toMatch(/\{[a-z0-9]+\}|\]\((mail|home)\)/);
  });

  it("is in the sitemap", () => {
    expect(sitemap().map((page) => page.url)).toContain(`${SITE_URL}/privacy`);
  });
});

describe("the footer", () => {
  const footerLinks = () => within(screen.getByRole("contentinfo")).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]);

  it("links to the privacy policy right after the terms, on the app, /terms and /privacy", () => {
    for (const Page of [Home, Terms, Privacy]) {
      render(<Page />);
      const links = footerLinks();
      const terms = links.findIndex(([, href]) => href === TERMS_PATH);
      expect(links[terms + 1]).toEqual([koOnly.privacyLink, PRIVACY_PATH]);
      expect(koOnly.privacyLink).toBe("개인정보 처리방침");
      cleanup();
    }
  });

  it("has no link to it on the English screen, which has no Korean pages to point to", () => {
    render(<EmotionApp locale="en" />);
    expect(footerLinks().map(([, href]) => href)).not.toContain(PRIVACY_PATH);
  });
});
