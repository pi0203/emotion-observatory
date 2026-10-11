import type { Metadata } from "next";
import NotFound from "next/dist/client/components/builtin/not-found";
import "./globals.css";
import { metadataFor } from "../lib/i18n/metadata";
import KoreanDocument from "./korean-document";

/**
 * With one root layout per language there is no single layout left to draw a
 * 404 for an unknown address, so this page does it (experimental.globalNotFound
 * in next.config.ts). It keeps the 404 exactly as it was before the split: the
 * Korean shell, the app's stylesheet and title, and Next's own 404 body.
 */
export const metadata: Metadata = metadataFor("ko");

export default function GlobalNotFound() {
  return (
    <KoreanDocument>
      <NotFound />
    </KoreanDocument>
  );
}
