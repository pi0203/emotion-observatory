import type { Metadata } from "next";
import { TermsPage } from "../../emotion-app";
import privacy from "../../../data/privacy.ko.json";
import { documentTitle, metadataFor } from "../../../lib/i18n/metadata";
import { PRIVACY_PATH } from "../../../lib/terms";

/**
 * /privacy, the privacy policy (owner's decision 2026-11-02: draft v1 taken as
 * it is). Korean only, a static page in the same frame and type as /terms; the
 * text is read here at build time from data/privacy.ko.json.
 */
const app = metadataFor("ko");
const title = `${privacy.title} · ${documentTitle("ko")}`;

export const metadata: Metadata = {
  title,
  alternates: { canonical: PRIVACY_PATH },
  openGraph: { ...app.openGraph, title, url: PRIVACY_PATH },
  twitter: { ...app.twitter, title },
};

export default function Privacy() {
  const { title: heading, intro, sections, changes } = privacy;
  return <TermsPage terms={{ title: heading, intro, sections, changes }} />;
}
