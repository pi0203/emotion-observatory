// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { en } from "../lib/i18n/messages.en";
import { ko } from "../lib/i18n/messages.ko";

/**
 * The screen never says more than the research behind it (docs/EVIDENCE_LEVELS.md §3,
 * owner's decision 2026-11-01). Like tests/no-persona.test.ts, this walks every
 * message and every content file, and fails on a word that settles a question
 * the evidence leaves open, or on a number whose source is shaky or missing.
 */
type Tree = { [key: string]: string | readonly string[] | Tree };
const strings = (tree: Tree, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value] as [string, string]]
      : Array.isArray(value) ? value.map((item, index) => [`${prefix}${key}[${index}]`, String(item)] as [string, string])
        : strings(value as Tree, `${prefix}${key}.`));

/** Every string in the Korean (and language-neutral) content files; the English files are written apart. */
const koreanDataStrings = (): [string, string][] =>
  readdirSync("data").filter((name) => name.endsWith(".json") && !name.endsWith(".en.json")).flatMap((name) => {
    const found: [string, string][] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string") found.push([path, value]);
      else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${path}[${index}]`));
      else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) walk(item, `${path}.${key}`);
    };
    walk(JSON.parse(readFileSync(`data/${name}`, "utf8")), name);
    return found;
  });

// words that settle what the evidence does not; 증명서 (a certificate) is not one of them
const KO_CERTAINTY = /입증|증명(?!서)|과학적으로\s*(?:밝혀|확인|증명)|확연히|현저히|틀림없이|반드시\s*효과/;
// numbers repeated in popular books whose source is shaky or missing (docs/EVIDENCE_LEVELS.md); bounded so 190초 or 13:10 do not match
const KO_SHAKY_NUMBER = /(?<!\d)90\s*초|(?<![\d.])3\s*:\s*1(?![\d.])|(?<![\d.])93\s*%/;
const EN_CERTAINTY = /\b(?:proven|proves|scientifically (?:shown|proven)|research (?:shows|proves) that|guaranteed|dramatically)\b/i;

const hitsOf = (pairs: [string, string][], pattern: RegExp) => pairs.filter(([, text]) => pattern.test(text)).map(([path, text]) => `${path}: ${text}`);

describe("the wording does not claim more than the evidence", () => {
  const korean = [...strings(ko as unknown as Tree), ...koreanDataStrings()];

  it("no Korean message or content file uses a word of proof or certainty", () => {
    expect(hitsOf(korean, KO_CERTAINTY)).toEqual([]);
  });

  it("no Korean message or content file repeats a number without a sound source", () => {
    expect(hitsOf(korean, KO_SHAKY_NUMBER)).toEqual([]);
  });

  it("no English message says research proves or guarantees", () => {
    expect(hitsOf(strings(en as unknown as Tree), EN_CERTAINTY)).toEqual([]);
  });

  it("the patterns catch what they should and spare look-alike sentences", () => {
    for (const sentence of ["효과가 입증된 방법", "연구로 증명되었다", "과학적으로 밝혀진 사실", "과학적으로 확인된 효과", "확연히 줄어듭니다", "현저히 나아진다", "틀림없이 도움이 됩니다", "반드시 효과가 있다"]) expect(KO_CERTAINTY.test(sentence), sentence).toBe(true);
    for (const sentence of ["증명서를 떼러 갔다", "과학적으로 아직 모른다", "반드시 적지 않아도 됩니다", "효과는 아직 확인되지 않았다", "뚜렷하지 않을 수 있어요"]) expect(KO_CERTAINTY.test(sentence), sentence).toBe(false);

    for (const sentence of ["감정은 90초면 지나간다", "긍정과 부정의 비율 3:1", "3 : 1이 넘어야 한다", "의사소통의 93%는 말이 아니다"]) expect(KO_SHAKY_NUMBER.test(sentence), sentence).toBe(true);
    for (const sentence of ["190초 동안", "13:10에 적은 기록", "3:15에 적음", "0.93%", "1분 30초쯤"]) expect(KO_SHAKY_NUMBER.test(sentence), sentence).toBe(false);

    for (const sentence of ["This method is proven to work", "Research shows that naming calms you", "It is scientifically shown", "Results are guaranteed", "It dramatically reduces stress", "This proves it"]) expect(EN_CERTAINTY.test(sentence), sentence).toBe(true);
    for (const sentence of ["It has not yet been shown to help", "Research is still open", "a proverb", "a dramatic change in weather", "approved by the owner"]) expect(EN_CERTAINTY.test(sentence), sentence).toBe(false);
  });
});
