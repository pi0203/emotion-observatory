import type { Metadata } from "next";
import { TermsPage } from "../../emotion-app";
import terms from "../../../data/terms.ko.json";
import { documentTitle, metadataFor } from "../../../lib/i18n/metadata";
import { TERMS_PATH } from "../../../lib/terms";

/**
 * /terms, the terms of use (docs/TERMS.md). Korean only, a static page: the
 * text is read here at build time and handed to the screen, with no request.
 * The app's head is shared, with this page's own title and address.
 */
const app = metadataFor("ko");
const title = `${terms.title} · ${documentTitle("ko")}`;

export const metadata: Metadata = {
  title,
  alternates: { canonical: TERMS_PATH },
  openGraph: { ...app.openGraph, title, url: TERMS_PATH },
  twitter: { ...app.twitter, title },
};

export default function Terms() {
  const { title: heading, intro, sections, changes } = terms;
  return <TermsPage terms={{ title: heading, intro, sections, changes }} />;
}
