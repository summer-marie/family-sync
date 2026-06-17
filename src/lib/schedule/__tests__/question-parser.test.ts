import { describe, it, expect } from "vitest";
import { parseQuestion, QuestionType } from "@/lib/schedule/question-parser";

describe("parseQuestion", () => {
  describe("FREE_AT_TIME — is a specific time slot free for everyone", () => {
    it("classifies 'Is everyone free Sunday afternoon?'", () => {
      expect(parseQuestion("Is everyone free Sunday afternoon?")).toBe(
        QuestionType.FREE_AT_TIME
      );
    });

    it("classifies 'Are we all free on Saturday at 3pm?'", () => {
      expect(parseQuestion("Are we all free on Saturday at 3pm?")).toBe(
        QuestionType.FREE_AT_TIME
      );
    });
  });

  describe("WHO_IS_BUSY — which members have something on a given day", () => {
    it("classifies 'Who is busy on Thursday?'", () => {
      expect(parseQuestion("Who is busy on Thursday?")).toBe(
        QuestionType.WHO_IS_BUSY
      );
    });

    it("classifies 'Who has something on Friday morning?'", () => {
      expect(parseQuestion("Who has something on Friday morning?")).toBe(
        QuestionType.WHO_IS_BUSY
      );
    });
  });

  describe("FREE_WINDOW — find an open window across the family", () => {
    it("classifies 'When is everyone free this week?'", () => {
      expect(parseQuestion("When is everyone free this week?")).toBe(
        QuestionType.FREE_WINDOW
      );
    });

    it("classifies 'Find a time when we are all available'", () => {
      expect(parseQuestion("Find a time when we are all available")).toBe(
        QuestionType.FREE_WINDOW
      );
    });

    it("resolves to FREE_WINDOW not FREE_AT_TIME for 'When is everyone free this Sunday?'", () => {
      // This input overlaps both patterns: "everyone free" would match FREE_AT_TIME
      // if the check order were reversed. This test enforces the documented priority.
      expect(parseQuestion("When is everyone free this Sunday?")).toBe(
        QuestionType.FREE_WINDOW
      );
    });
  });

  describe("SUMMARIZE_CONFLICTS_DAY — what is on the schedule for a day", () => {
    it("classifies 'What conflicts do we have today?'", () => {
      expect(parseQuestion("What conflicts do we have today?")).toBe(
        QuestionType.SUMMARIZE_CONFLICTS_DAY
      );
    });

    it("classifies 'What does everyone have going on tomorrow?'", () => {
      expect(parseQuestion("What does everyone have going on tomorrow?")).toBe(
        QuestionType.SUMMARIZE_CONFLICTS_DAY
      );
    });
  });

  describe("OUT_OF_SCOPE — unsupported or unrelated questions", () => {
    it("returns OUT_OF_SCOPE for 'Book a flight for me'", () => {
      expect(parseQuestion("Book a flight for me")).toBe(
        QuestionType.OUT_OF_SCOPE
      );
    });

    it("returns OUT_OF_SCOPE for 'What is the weather today?'", () => {
      expect(parseQuestion("What is the weather today?")).toBe(
        QuestionType.OUT_OF_SCOPE
      );
    });

    it("returns OUT_OF_SCOPE for 'Add an event to my calendar'", () => {
      expect(parseQuestion("Add an event to my calendar")).toBe(
        QuestionType.OUT_OF_SCOPE
      );
    });

    it("returns OUT_OF_SCOPE for an empty string", () => {
      expect(parseQuestion("")).toBe(QuestionType.OUT_OF_SCOPE);
    });

    // BUG: The implementation matches "available" as a bare substring anywhere in
    // the sentence, causing false positives for FREE_WINDOW. These two tests expose
    // that gap and are expected to FAIL until question-parser.ts is updated to use
    // more precise pattern matching (e.g. requiring scheduling intent context around
    // the keyword rather than a bare substring match).
    it("returns OUT_OF_SCOPE for 'I'm not available this weekend'", () => {
      expect(parseQuestion("I'm not available this weekend")).toBe(
        QuestionType.OUT_OF_SCOPE
      );
    });

    it("returns OUT_OF_SCOPE for 'Let me know when you're available'", () => {
      expect(parseQuestion("Let me know when you're available")).toBe(
        QuestionType.OUT_OF_SCOPE
      );
    });
  });
});
