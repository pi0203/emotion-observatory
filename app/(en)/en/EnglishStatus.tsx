import { hasContent } from "../../../lib/content";
import { hasMessages } from "../../../lib/i18n/t";

/**
 * A development frame, not a page for visitors. It reads no records and writes
 * nothing. When stages C and D add English messages and content, the app's
 * screens go here under <I18nProvider locale="en">; until then nothing in
 * Korean is shown in their place.
 */
export default function EnglishStatus() {
  const rows = [
    { what: "Messages (lib/i18n/messages.en.ts)", ready: hasMessages("en") },
    { what: "Content (data/*.en.json)", ready: hasContent("en") },
  ];
  return (
    <main className="app-shell">
      <section className="screen">
        <p className="eyebrow">Development only</p>
        <h1>/en is not written yet</h1>
        <p className="lede">This route exists so the English pages have their own document language. Nothing is shown in Korean in its place.</p>
        <ul className="synthesis-lines" aria-label="English readiness">
          {rows.map((row) => (
            <li key={row.what}>
              {row.what}: <strong>{row.ready ? "written" : "not written"}</strong>
            </li>
          ))}
        </ul>
        <p className="small-note">Plan: docs/I18N_PLAN.md, stages C and D.</p>
      </section>
    </main>
  );
}
