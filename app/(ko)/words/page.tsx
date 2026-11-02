import type { Metadata } from "next";
import { WordsPage } from "../../emotion-app";
import emotions from "../../../data/emotions.ko.json";
import { koOnly } from "../../../lib/i18n/messages.ko";
import { documentTitle, metadataFor } from "../../../lib/i18n/metadata";
import { WORDS_PATH, wordCards } from "../../../lib/words";

/**
 * /words, every word of the app on one page (lib/words.ts). Korean only, a
 * static page: data/emotions.ko.json is read here at build time and only the
 * fields the page draws are handed on, with no request.
 */
const app = metadataFor("ko");
const title = `${koOnly.words.title} · ${documentTitle("ko")}`;

export const metadata: Metadata = {
  title,
  alternates: { canonical: WORDS_PATH },
  openGraph: { ...app.openGraph, title, url: WORDS_PATH },
  twitter: { ...app.twitter, title },
};

export default function Words() {
  return <WordsPage cards={wordCards(emotions.items)} />;
}
