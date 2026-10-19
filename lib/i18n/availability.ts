import { reviewStatus } from "./messages.en";

/**
 * Whether the English messages and content may be used. Production shows
 * English only after the owner has reviewed it (`reviewStatus` in
 * messages.en.ts, docs/I18N_PLAN.md §4). The development server shows the
 * drafts so they can be read in place before that review. Tests run neither,
 * so English stays off there unless a test turns it on.
 */
export const englishAvailable = () => reviewStatus === "reviewed" || process.env.NODE_ENV === "development";
