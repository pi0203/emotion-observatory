import { notFound } from "next/navigation";
import EnglishStatus from "./EnglishStatus";
import EmotionApp from "../../emotion-app";
import { hasContent } from "../../../lib/content";
import { hasMessages } from "../../../lib/i18n/t";

/**
 * /en. Blocked in production builds (the 404 page), open in development, the
 * same way as the prototypes. It does not fall back to Korean: until English
 * messages and content are written it shows only what is missing.
 */
export default function EnglishPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // the English drafts in place, for reading before review; the status frame while they are switched off
  if (hasMessages("en") && hasContent("en")) return <EmotionApp locale="en" />;
  return <EnglishStatus />;
}
