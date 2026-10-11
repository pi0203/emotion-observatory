// @vitest-environment node
import { describe, expect, it } from "vitest";
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
    expect(calls.some((call) => call.where.startsWith("app/(ko)/page.tsx"))).toBe(true);
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
    // not a Hangul syllable: the vowel form, as particleFor always did
    expect(interpolate("{x}{~x|을/를}", { x: "OK" })).toBe("OK를");
  });

  it("reads the particle from the raw word, not from the quotation mark around it", () => {
    expect(getT()("synthesis.observed.quickEmotion", { list: "“짜증”, “억울함”", last: "억울함" })).toBe("가까운 말로는 “짜증”, “억울함”을 골랐습니다.");
    expect(particleFor("“억울함”", "을", "를")).toBe("를");
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

describe("a language that is not written yet", () => {
  it("says so plainly instead of falling back to Korean", () => {
    expect(hasMessages("ko")).toBe(true);
    expect(hasMessages("en")).toBe(false);
    expect(() => createT("en")).toThrow(/not|No messages/);
    expect(hasContent("ko")).toBe(true);
    expect(hasContent("en")).toBe(false);
    expect(getContent("en")).toBeNull();
    expect(() => requireContent("en")).toThrow(/has not been written yet/);
  });

  it("gives Korean content by default, the same files as before", () => {
    expect(getContent()).toBe(getContent("ko"));
    expect(requireContent("ko").emotions.items.length).toBeGreaterThan(50);
  });
});
