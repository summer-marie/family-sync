/**
 * Question types supported by the AI schedule chat for the MVP.
 * Any question that does not match a supported type resolves to OUT_OF_SCOPE,
 * which the chat route maps to a short fallback message. This keeps the model
 * from attempting calendar edits or unrelated actions.
 */
export const QuestionType = {
  FREE_AT_TIME: "FREE_AT_TIME",
  WHO_IS_BUSY: "WHO_IS_BUSY",
  FREE_WINDOW: "FREE_WINDOW",
  SUMMARIZE_CONFLICTS_DAY: "SUMMARIZE_CONFLICTS_DAY",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

/**
 * parseQuestion classifies a natural-language question into one of the MVP
 * supported question types, or OUT_OF_SCOPE. Classification is keyword-based
 * and intentionally narrow per the AI chat notes: a few clear question types
 * are supported, everything else gets a safe fallback.
 *
 * Pattern ordering matters: FREE_WINDOW is checked before FREE_AT_TIME because
 * a phrase like "When is everyone free this week?" contains "everyone free"
 * but is asking for an open window, not a single-slot availability check.
 */
export function parseQuestion(question: string): QuestionType {
  let q = question.trim().toLowerCase();

  // Normalize common contractions to expanded forms for matching.
  // This makes the parser more natural-language friendly without
  // expanding the pattern list.
  q = q.replace(/who's/g, "who is");
  q = q.replace(/when's/g, "when is");
  q = q.replace(/what's/g, "what is");

  if (!q) return QuestionType.OUT_OF_SCOPE;

  // FREE_WINDOW: asking to find an open window across the family.
  // "available" is intentionally matched only with a collective subject to avoid
  // false positives from casual sentences like "I'm not available this weekend".
  if (
    q.includes("when is everyone free") ||
    q.includes("find a time") ||
    q.includes("all available") ||
    q.includes("everyone available")
  ) {
    return QuestionType.FREE_WINDOW;
  }

  // FREE_AT_TIME: asking whether a specific slot is free for everyone.
  if (
    q.includes("is everyone free") ||
    q.includes("are we all free") ||
    q.includes("are you free") ||
    q.includes("are they free")
  ) {
    return QuestionType.FREE_AT_TIME;
  }

  // WHO_IS_BUSY: asking which members have something on a given day.
  if (q.includes("who is busy") || q.includes("who has something")) {
    return QuestionType.WHO_IS_BUSY;
  }

  // SUMMARIZE_CONFLICTS_DAY: asking what is on the schedule for a day.
  // "have going on" and "got going on" are both required rather than bare
  // "going on" to avoid matching casual speech like "What's going on?"
  // that has no scheduling intent. "got going on" is the colloquial form
  // of "have going on" (e.g. "What's everyone got going on?").
  if (q.includes("conflicts") || q.includes("have going on") || q.includes("got going on")) {
    return QuestionType.SUMMARIZE_CONFLICTS_DAY;
  }

  return QuestionType.OUT_OF_SCOPE;
}