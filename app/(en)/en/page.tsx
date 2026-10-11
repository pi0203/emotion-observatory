import { notFound } from "next/navigation";
import EnglishStatus from "./EnglishStatus";

/**
 * /en. Blocked in production builds (the 404 page), open in development, the
 * same way as the prototypes. It does not fall back to Korean: until English
 * messages and content are written it shows only what is missing.
 */
export default function EnglishPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <EnglishStatus />;
}
