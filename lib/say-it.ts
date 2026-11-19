import { currentWords } from "./coach";
import { requireContent } from "./content";
import { localeOf } from "./i18n/locale";
import type { Translate } from "./i18n/t";
import { wordLines } from "./records";
import type { EmotionSession } from "./session-types";

/**
 * The three lines under 「사실 / 내 느낌 / 원하는 것을 나눠 적기」 on the need screen
 * (2026-11-19): what the record already holds for each, and the one sentence the
 * lines are joined into.
 *
 * The joining is a fixed frame, with no model and no request to anywhere. What the
 * person wrote goes inside quotation marks exactly as written: no ending is
 * conjugated and no letter is changed (only the blank space around a line is left
 * out). A line left empty drops its clause. Nothing here reads or writes storage.
 */
export const SAY_KEYS = ["fact", "feel", "want"] as const;
export type SayKey = (typeof SAY_KEYS)[number];
export type SayParts = Record<SayKey, string>;
export type SayClause = { key: SayKey; text: string };

/** The interpunct that joins several words on one line. */
const JOINER = " · ";

/**
 * What the record holds for the three lines. The situation is the slower look's
 * if it has one, else the quick look's line. The words are the ones the record
 * keeps, without the pressed answers 「여러 개」 and 「잘 모르겠음」, which are not
 * words for a feeling. What mattered leaves out the offered 「잘 모르겠다」, the last
 * entry of the list, for the same reason.
 */
export const sayFromRecord = (session: EmotionSession): { parts: SayParts; factFrom?: "deep" | "quick" } => {
  const deepEvent = session.deepReflection?.context?.eventText?.trim();
  const quickEvent = session.quickCheck?.context?.eventText?.trim();
  const pressed = new Set(wordLines(session).filter((line) => line.how === "pressed").flatMap((line) => line.words));
  const notSure = (requireContent(localeOf(session)).concerns as readonly string[]).at(-1);
  return {
    parts: {
      fact: deepEvent || quickEvent || "",
      feel: currentWords(session).filter((word) => !pressed.has(word)).join(JOINER),
      want: (session.deepReflection?.concerns ?? []).filter((item) => item !== notSure).join(JOINER),
    },
    factFrom: deepEvent ? "deep" : quickEvent ? "quick" : undefined,
  };
};

/** The end of a line as the particle rule should see it: closing punctuation and symbols are not what the ending attaches to. */
const endOf = (text: string) => text.replace(/[\s\p{P}\p{S}]+$/u, "") || text;

/**
 * The clauses of the joined sentence, in order, one for each line that has text.
 * The feeling clause links on to what mattered when both are there, and ends the
 * sentence when it is last. `polite` changes the endings and 나/내 to 저/제 only.
 */
export const sayClauses = (parts: SayParts, polite: boolean, t: Translate): SayClause[] => {
  const fact = parts.fact.trim();
  const feel = parts.feel.trim();
  const want = parts.want.trim();
  const clauses: SayClause[] = [];
  if (fact) clauses.push({ key: "fact", text: polite ? t("sayIt.said.polite.fact", { fact }) : t("sayIt.said.casual.fact", { fact }) });
  if (feel && want) clauses.push({ key: "feel", text: polite ? t("sayIt.said.polite.feelThen", { feel }) : t("sayIt.said.casual.feelThen", { feel }) });
  if (feel && !want) clauses.push({ key: "feel", text: polite ? t("sayIt.said.polite.feelLast", { feel }) : t("sayIt.said.casual.feelLast", { feel }) });
  if (want) {
    const wantEnd = endOf(want);
    clauses.push({ key: "want", text: polite ? t("sayIt.said.polite.want", { want, wantEnd }) : t("sayIt.said.casual.want", { want, wantEnd }) });
  }
  return clauses;
};

/** The sentence as it is copied: the clauses with one space between them. */
export const saySentence = (parts: SayParts, polite: boolean, t: Translate) => sayClauses(parts, polite, t).map((clause) => clause.text).join(" ");
