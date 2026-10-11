import type { Metadata } from "next";
import "../globals.css";
import { metadataFor } from "../../lib/i18n/metadata";
import KoreanDocument from "../korean-document";

/** The root layout for everything in Korean: "/" and the development prototypes. */
export const metadata: Metadata = metadataFor("ko");

export default function KoreanRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <KoreanDocument>{children}</KoreanDocument>;
}
