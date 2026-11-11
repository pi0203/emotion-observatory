import { notFound } from "next/navigation";
import EnglishStatus from "./EnglishStatus";
import EmotionApp from "../../emotion-app";
import StructuredData from "../../structured-data";
import { hasContent } from "../../../lib/content";
import { hasMessages } from "../../../lib/i18n/t";

/**
 * /en. Open since the owner marked the English as reviewed (2026-10-19,
 * `reviewStatus` in lib/i18n/messages.en.ts). If that is set back to "draft",
 * a production build shows the 404 page again; development then shows only
 * what is missing. It never falls back to Korean.
 */
export default function EnglishPage() {
  if (hasMessages("en") && hasContent("en")) {
    return (
      <>
        <StructuredData locale="en" />
        <EmotionApp locale="en" />
      </>
    );
  }
  if (process.env.NODE_ENV === "production") notFound();
  return <EnglishStatus />;
}
