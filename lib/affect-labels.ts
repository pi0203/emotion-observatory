/** Wording for the affect readings. Shared so the summary and the synthesis never drift apart. */
export const quickValence = (value?: number) =>
  ["", "불편함 쪽", "조금 불편함 쪽", "중간", "조금 편안함 쪽", "편안함 쪽"][value ?? 3] ?? "중간";

export const quickActivation = (value?: number) =>
  ["", "가라앉은 느낌", "조금 가라앉은 느낌", "중간", "에너지가 올라온 느낌", "에너지가 많이 올라온 느낌"][value ?? 3] ?? "중간";

export const scaleLabel = (value?: number) =>
  ["", "매우 불쾌", "불쾌", "중간", "유쾌", "매우 유쾌"][value ?? 3] ?? "중간";

export const activationLabel = (value?: number) =>
  ["", "가라앉음", "조금 가라앉음", "중간", "활성됨", "많이 활성됨"][value ?? 3] ?? "중간";

export const contextSourceLabel = (source?: "event" | "memory" | "anticipation" | "thought") =>
  ({ event: "실제 사건", memory: "기억", anticipation: "예상", thought: "생각" }[source ?? "event"]);

/** Picks the Korean particle that fits the last syllable of `word`. */
export const particleFor = (word: string, afterConsonant: string, afterVowel: string) => {
  const last = word.trim().at(-1) ?? "";
  const code = last.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangulSyllable) return afterVowel;
  return (code - 0xac00) % 28 === 0 ? afterVowel : afterConsonant;
};

export const withParticle = (word: string, afterConsonant: string, afterVowel: string) =>
  `${word}${particleFor(word, afterConsonant, afterVowel)}`;
