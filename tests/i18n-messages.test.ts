// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createT, getT, hasMessages, interpolate, isWellFormed, particleFor, placeholdersOf } from "../lib/i18n";
import { ko } from "../lib/i18n/messages.ko";
import { getContent, hasContent, requireContent } from "../lib/content";
import { formatWhen } from "../lib/records";
import { findMessageCalls, type MessageCall } from "./helpers/message-calls";
import { appSourceFiles, isMessageFile } from "./helpers/source-files";

type Tree = { [key: string]: string | readonly string[] | Tree };

/** Every message in the dictionary by its dotted key. */
const flatten = (tree: Tree, prefix = ""): Map<string, string | readonly string[]> =>
  new Map(Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" || Array.isArray(value) ? [[`${prefix}${key}`, value as string | readonly string[]]] : [...flatten(value as Tree, `${prefix}${key}.`)]));

const messages = flatten(ko as unknown as Tree);
const strings = [...messages].filter((entry): entry is [string, string] => typeof entry[1] === "string");
const calls: MessageCall[] = appSourceFiles().filter((file) => !isMessageFile(file)).flatMap(findMessageCalls);

/** The keys a call can reach: one key, or every key under a template key's prefix. */
const reachable = (call: MessageCall) =>
  call.isPrefix ? [...messages.keys()].filter((key) => key.startsWith(call.key)) : messages.has(call.key) ? [call.key] : [];

describe("the Korean dictionary", () => {
  it("finds the message requests in the code", () => {
    expect(calls.length).toBeGreaterThan(150);
    // the screens moved to app/emotion-app.tsx (shared by "/" and "/en", 2026-10-19)
    expect(calls.some((call) => call.where.startsWith("app/emotion-app.tsx"))).toBe(true);
    expect(calls.some((call) => call.where.startsWith("lib/synthesis.ts"))).toBe(true);
  });

  it("has every key the code asks for, of the right kind", () => {
    const missing = calls.filter((call) => {
      const keys = reachable(call);
      if (!keys.length) return true;
      return keys.some((key) => (typeof messages.get(key) === "string") === call.list);
    });
    expect(missing.map((call) => `${call.where} ${call.key}`)).toEqual([]);
  });

  it("is given exactly the parameters each message uses", () => {
    const mismatched = calls.flatMap((call) => {
      if (call.list || call.params === undefined) return [];
      return reachable(call).flatMap((key) => {
        const expected = placeholdersOf(messages.get(key) as string).sort();
        const given = [...call.params!].sort();
        return JSON.stringify(expected) === JSON.stringify(given) ? [] : [`${call.where} ${key}: needs [${expected}] got [${given}]`];
      });
    });
    expect(mismatched).toEqual([]);
  });

  it("has no message the code never asks for", () => {
    const used = new Set(calls.flatMap(reachable));
    const unused = [...messages.keys()].filter((key) => !used.has(key));
    expect(unused).toEqual([]);
  });

  it("writes every placeholder well-formed and fills it without leftovers", () => {
    for (const [key, template] of strings) {
      expect(isWellFormed(template), key).toBe(true);
      const params = Object.fromEntries(placeholdersOf(template).map((name) => [name, "값"]));
      expect(interpolate(template, params), key).not.toMatch(/[{}]/);
    }
  });

  it("refuses a missing parameter instead of showing a hole", () => {
    expect(() => interpolate("진행 {step}", {})).toThrow(/step/);
  });

  it("keeps each list the same length as the bands it names", () => {
    for (const key of ["affectBands.quickValence", "affectBands.quickActivation", "affectBands.valence", "affectBands.activation"] as const) {
      expect(getT("ko").list(key)).toHaveLength(5);
    }
  });
});

describe("Korean particles chosen inside the messages", () => {
  it("follows the last syllable, as the code did before", () => {
    expect(interpolate("{x}{~x|을/를}", { x: "짜증" })).toBe("짜증을");
    expect(interpolate("{x}{~x|을/를}", { x: "기쁨이" })).toBe("기쁨이를");
    expect(interpolate("{x}{~x|으로/로}", { x: "불쾌 · 가라앉음" })).toBe("불쾌 · 가라앉음으로");
    expect(interpolate("{x}{~x|으로/로}", { x: "중간 · 활성됨" })).toBe("중간 · 활성됨으로");
    expect(interpolate("{x}{~x|으로/로}", { x: "잘 모르겠음" })).toBe("잘 모르겠음으로");
    expect(interpolate("{x}{~x|으로/로}", { x: "매우 유쾌" })).toBe("매우 유쾌로");
    // not a Hangul syllable (Latin, digit, symbol): both forms, 「을(를)」 (2026-11-10; it was the vowel form before)
    expect(interpolate("{x}{~x|을/를}", { x: "OK" })).toBe("OK을(를)");
    expect(interpolate("{x}{~x|을/를}", { x: "3" })).toBe("3을(를)");
    expect(interpolate("{x}{~x|을/를}", { x: "짜증!" })).toBe("짜증!을(를)");
    expect(interpolate("{x}{~x|으로/로}", { x: "OK" })).toBe("OK으로(로)");
  });

  it("takes 「로」, not 「으로」, after a final ㄹ (2026-11-10)", () => {
    expect(interpolate("{x}{~x|으로/로}", { x: "말" })).toBe("말로");
    expect(interpolate("{x}{~x|으로/로}", { x: "물" })).toBe("물로");
    expect(interpolate("{x}{~x|으로/로}", { x: "하늘" })).toBe("하늘로");
    expect(interpolate("{x}{~x|으로/로}", { x: "말".normalize("NFD") })).toBe(`${"말".normalize("NFD")}로`);
    // only 으로/로: other particles keep the consonant form after ㄹ
    expect(interpolate("{x}{~x|을/를}", { x: "말" })).toBe("말을");
    expect(interpolate("{x}{~x|이/가}", { x: "물" })).toBe("물이");
    expect(interpolate("{x}{~x|은/는}", { x: "말" })).toBe("말은");
    // other final consonants still take 으로
    expect(interpolate("{x}{~x|으로/로}", { x: "밥" })).toBe("밥으로");
    expect(particleFor("말", "으로", "로")).toBe("로");
    expect(particleFor("말", "으로서", "로서")).toBe("로서");
    expect(particleFor("물", "으로써", "로써")).toBe("로써");
  });

  it("reads the particle from the raw word, not from the quotation mark around it", () => {
    expect(getT()("synthesis.observed.quickEmotion", { list: "“짜증”, “억울함”", last: "억울함" })).toBe("가까운 말로는 “짜증”, “억울함”을 골랐습니다.");
    expect(particleFor("“억울함”", "을", "를")).toBe("을(를)");
  });

  it("reads a final consonant from a word typed or pasted in decomposed form (NFD), as 「“피곤함”를」 showed (2026-11-10)", () => {
    const quick = (word: string) => getT()("synthesis.observed.quickEmotion", { list: `“${word}”`, last: word });
    for (const form of ["NFC", "NFD"] as const) {
      expect(quick("피곤함".normalize(form))).toBe(`가까운 말로는 “${"피곤함".normalize(form)}”을 골랐습니다.`);
      expect(quick("불안".normalize(form))).toBe(`가까운 말로는 “${"불안".normalize(form)}”을 골랐습니다.`);
      expect(quick("아파".normalize(form))).toBe(`가까운 말로는 “${"아파".normalize(form)}”를 골랐습니다.`);
    }
  });

  it("chooses 은/는 after a word the user wrote inside ‘ ’, not a fixed 「은」 (2026-11-13)", () => {
    const t = getT();
    expect(t("words.meaningLabel", { label: "죽고 싶어" })).toBe("‘죽고 싶어’는 지금 나에게 어떤 느낌을 담고 있나요?");
    expect(t("words.meaningLabel", { label: "마음" })).toBe("‘마음’은 지금 나에게 어떤 느낌을 담고 있나요?");
    expect(t("words.meaningLabel", { label: "OK" })).toBe("‘OK’은(는) 지금 나에게 어떤 느낌을 담고 있나요?");
    expect(t("recordDetail.personalMeaning", { label: "죽고 싶어" })).toBe("‘죽고 싶어’는");
    expect(t("recordDetail.personalMeaning", { label: "마음" })).toBe("‘마음’은");
    expect(t("recordDetail.personalMeaning", { label: "OK" })).toBe("‘OK’은(는)");
  });
});

describe("dates", () => {
  /** The formatter as it was written before Intl, kept here to compare against. */
  const before = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  it("reads exactly as before in Korean", () => {
    const samples = ["2026-10-11T14:05:00+09:00", "2026-01-02T00:00:00Z", "2025-12-31T23:59:59Z", "2026-03-09T09:07:00+09:00", "1999-07-04T12:00:00Z", "not a date", ""];
    for (let index = 0; index < 200; index += 1) samples.push(new Date(Date.UTC(2020, 0, 1) + index * 7_919_993_117).toISOString());
    for (const iso of samples) expect(formatWhen(iso), iso).toBe(before(iso));
  });
});

describe("a language that is switched off", () => {
  it("says so plainly instead of falling back to Korean", async () => {
    expect(hasMessages("ko")).toBe(true);
    expect(hasContent("ko")).toBe(true);
    // English is open now (owner, 2026-10-19); set back to draft in production, it must not borrow Korean
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    vi.doMock("../lib/i18n/messages.en", async (original) => ({ ...(await original<object>()), reviewStatus: "draft" }));
    const i18n = await import("../lib/i18n");
    const content = await import("../lib/content");
    expect(i18n.hasMessages("en")).toBe(false);
    expect(() => i18n.createT("en")).toThrow(/not|No messages/);
    expect(content.hasContent("en")).toBe(false);
    expect(content.getContent("en")).toBeNull();
    expect(() => content.requireContent("en")).toThrow(/has not been written yet/);
    vi.doUnmock("../lib/i18n/messages.en");
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("gives Korean content by default, the same files as before", () => {
    expect(getContent()).toBe(getContent("ko"));
    expect(requireContent("ko").emotions.items.length).toBeGreaterThan(50);
  });
});
