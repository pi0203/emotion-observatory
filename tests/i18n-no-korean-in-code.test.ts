// @vitest-environment node
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findHangulLiterals } from "./helpers/hangul-literals";
import { appSourceFiles, isMessageFile, ROOT } from "./helpers/source-files";

/**
 * Korean wording lives in lib/i18n/messages.ko.ts and Korean content in
 * data/*.ko.json. This keeps new Korean text from being written straight into
 * the code again, where a second language could not reach it. Comments are not
 * text on screen, so they are not checked.
 */
describe("no Korean text written into the code", () => {
  const files = appSourceFiles().filter((file) => !isMessageFile(file));

  it("checks the screen and every lib file", () => {
    expect(files).toContain("app/page.tsx");
    expect(files).toContain("lib/synthesis.ts");
    expect(files).toContain("lib/i18n/react.tsx");
  });

  it.each(files)("%s has no Korean string, template or JSX text", (file) => {
    const found = findHangulLiterals(path.join(ROOT, file)).map((item) => `${file}:${item.line} ${item.kind} ${item.text}`);
    expect(found).toEqual([]);
  });

  it("the scanner itself finds Korean in literals and JSX, and ignores comments", () => {
    const found = findHangulLiterals(path.join(ROOT, "tests/helpers/hangul-fixture.tsx"));
    expect(found.map((item) => item.kind).sort()).toEqual(["JsxText", "NoSubstitutionTemplateLiteral", "StringLiteral", "TemplateHead"].sort());
  });
});
