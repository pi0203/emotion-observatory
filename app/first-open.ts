/**
 * The landing's two first-open motions (the intro sentence sharpening, the plum blossom
 * opening) play once per visit: the first time the landing screen is shown after the page
 * loads. Going into a record and coming back, or to the records list and back, does not
 * play them again. A reload is a new visit. On the server nothing marks it, so the
 * first HTML always carries the motion.
 *
 * Some ways back to the landing load the page again (the plain link 「기록실로 돌아가기」
 * after a record). That page was reached from this site, so it is the same visit: the
 * small script below, run before the page is painted, sets data-first-open-done on <html>
 * and the CSS turns the two motions off. A reload keeps the referrer of the page before it,
 * so the script first asks the browser how this page was reached: a reload is a new visit
 * and the motions play. Nothing is stored, only the navigation type and document.referrer
 * are read.
 */
let played = false;

export const FIRST_OPEN_INIT = `
try {
  var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var reload = !!nav && nav.type === "reload";
  if (!reload && document.referrer && new URL(document.referrer).origin === location.origin) document.documentElement.setAttribute("data-first-open-done", "");
} catch (e) {}
`;

export const firstOpenPending = () => !played;
export const markFirstOpenPlayed = () => { played = true; };
/** For tests only: start a new visit. */
export const resetFirstOpen = () => { played = false; };

/**
 * Splits the landing's intro sentence into three phrases for the sharpening: at the first
 * comma, then the rest at its middle word. Both languages give 「이름 붙이기 전에,」 /
 * 「지금 느껴지는 것을」 / 「그대로 남겨 둡니다.」 and its English counterpart; the three
 * parts joined with a space are the original sentence. Fewer than three parts: one phrase.
 */
export function introPhrases(text: string): string[] {
  const comma = text.indexOf(", ");
  if (comma < 0) return [text];
  const head = text.slice(0, comma + 1);
  const words = text.slice(comma + 2).split(" ");
  if (words.length < 2) return [text];
  const cut = Math.ceil(words.length / 2);
  return [head, words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}
