import EmotionApp from "../emotion-app";
import StructuredData from "../structured-data";

/** The Korean app at "/". The screens live in app/emotion-app.tsx, shared with /en; the JSON-LD in app/structured-data.tsx. */
export default function Home() {
  return (
    <>
      <StructuredData locale="ko" />
      <EmotionApp locale="ko" />
    </>
  );
}
