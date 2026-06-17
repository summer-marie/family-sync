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

    // The matcher intentionally only matches "available" with a collective
    // scheduling subject, so casual sentences using "available" do not produce
    // false positives for FREE_WINDOW.
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

    // "going on" is only matched when paired with "have going on" so casual
    // speech like "What's going on?" does not register as a schedule summary.
    it("returns OUT_OF_SCOPE for 'What's going on?'", () => {
      expect(parseQuestion("What's going on?")).toBe(QuestionType.OUT_OF_SCOPE);
    });
  });

  // Edge cases added during the TDD coverage review for the
  // feat/calendar-connection branch. These cover whitespace robustness,
  // contractions, compound questions, and priority-ordering regressions.
  describe("edge cases - whitespace, casing, and robustness", () => {
    it("ignores leading and trailing whitespace", () => {
      expect(parseQuestion("   Is everyone free Sunday?   ")).toBe(
        QuestionType.FREE_AT_TIME
      );
    });

    it("ignores internal newlines and tabs", () => {
      expect(parseQuestion("Is everyone free\n\tSunday afternoon?")).toBe(
        QuestionType.FREE_AT_TIME
      );
    });

    it("is case-insensitive for UPPERCASE input", () => {
      expect(parseQuestion("WHO IS BUSY ON THURSDAY?")).toBe(
        QuestionType.WHO_IS_BUSY
      );
    });

    it("returns OUT_OF_SCOPE for a whitespace-only string", () => {
      expect(parseQuestion("    \n\t  ")).toBe(QuestionType.OUT_OF_SCOPE);
    });
  });

  // Contractions are common in natural language but the current keyword
  // matcher uses the expanded phrase ("who is", "when is"). These tests are
  // expected to FAIL until question-parser.ts recognizes apostrophe
  // contractions (e.g. "who's", "when's") as equivalent to the expanded form.
  describe("edge cases - contractions (expected RED)", () => {
    it("classifies 'Who's busy on Thursday?' as WHO_IS_BUSY", () => {
      expect(parseQuestion("Who's busy on Thursday?")).toBe(
        QuestionType.WHO_IS_BUSY
      );
    });

    it("classifies 'When's everyone free this week?' as FREE_WINDOW", () => {
      expect(parseQuestion("When's everyone free this week?")).toBe(
        QuestionType.FREE_WINDOW
      );
    });

    it("classifies 'What's everyone got going on tomorrow?' as SUMMARIZE_CONFLICTS_DAY", () => {
      expect(parseQuestion("What's everyone got going on tomorrow?")).toBe(
        QuestionType.SUMMARIZE_CONFLICTS_DAY
      );
    });
  });

  // Compound inputs that overlap more than one pattern. These pin the
  // documented priority order (FREE_WINDOW before FREE_AT_TIME, etc.).
  describe("edge cases - compound and priority regression", () => {
    it("classifies a compound FREE_WINDOW + FREE_AT_TIME phrase as FREE_WINDOW", () => {
      // Contains both "when is everyone free" (window) and "is everyone free"
      // (at-time). The first matching pattern wins, so FREE_WINDOW is correct.
      expect(
        parseQuestion("When is everyone free and is everyone free Sunday?")
      ).toBe(QuestionType.FREE_WINDOW);
    });

    it("classifies 'Is everyone free Sunday and who is busy?' as FREE_AT_TIME", () => {
      // The FREE_AT_TIME phrase appears before the WHO_IS_BUSY phrase.
      expect(
        parseQuestion("Is everyone free Sunday and who is busy?")
      ).toBe(QuestionType.FREE_AT_TIME);
    });

    it("does not match FREE_AT_TIME when 'everyone free' is inside 'When is everyone free'", () => {
      expect(parseQuestion("When is everyone free this Sunday?")).toBe(
        QuestionType.FREE_WINDOW
      );
    });
  });
});