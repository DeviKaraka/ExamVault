/**
 * grading.test.ts
 *
 * Unit tests for the ExamVault grading engine.
 * Run with: npx vitest run
 */

import { describe, it, expect } from "vitest";
import {
  gradeMCQ,
  gradeDescriptive,
  gradeCoding,
  gradeAptitude,
  calculateExamScore,
  calculateGrade,
  calculatePercentage,
  applyNegativeMarking,
} from "@/lib/grading";

// ── MCQ grading ───────────────────────────────────────────────────────────────

describe("gradeMCQ", () => {
  it("awards full marks for a correct answer", () => {
    const result = gradeMCQ({ correctAnswer: "a", studentAnswer: "a", marks: 2 });
    expect(result.score).toBe(2);
    expect(result.isCorrect).toBe(true);
  });

  it("awards zero marks for a wrong answer (no negative marking)", () => {
    const result = gradeMCQ({ correctAnswer: "a", studentAnswer: "b", marks: 2 });
    expect(result.score).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("awards zero marks for an unanswered question", () => {
    const result = gradeMCQ({ correctAnswer: "a", studentAnswer: "", marks: 2 });
    expect(result.score).toBe(0);
    expect(result.isCorrect).toBe(false);
    expect(result.isSkipped).toBe(true);
  });

  it("is case-insensitive", () => {
    const result = gradeMCQ({ correctAnswer: "A", studentAnswer: "a", marks: 1 });
    expect(result.isCorrect).toBe(true);
  });

  it("handles undefined studentAnswer gracefully", () => {
    const result = gradeMCQ({ correctAnswer: "a", studentAnswer: undefined, marks: 1 });
    expect(result.score).toBe(0);
    expect(result.isSkipped).toBe(true);
  });
});

// ── Negative marking ──────────────────────────────────────────────────────────

describe("applyNegativeMarking", () => {
  it("deducts the configured fraction for a wrong answer", () => {
    const score = applyNegativeMarking({ baseScore: 0, marks: 4, negativeFraction: 0.25, isSkipped: false });
    expect(score).toBe(-1);
  });

  it("does not deduct for a skipped (unanswered) question", () => {
    const score = applyNegativeMarking({ baseScore: 0, marks: 4, negativeFraction: 0.25, isSkipped: true });
    expect(score).toBe(0);
  });

  it("never returns a score below zero for negative marking", () => {
    const score = applyNegativeMarking({ baseScore: 0, marks: 1, negativeFraction: 2, isSkipped: false });
    expect(score).toBeGreaterThanOrEqual(-1);
  });
});

// ── Descriptive / written grading ─────────────────────────────────────────────

describe("gradeDescriptive", () => {
  it("awards full marks when keywords are all present", () => {
    const result = gradeDescriptive({
      modelAnswer: "binary tree traversal inorder preorder postorder",
      studentAnswer: "binary tree traversal using inorder preorder and postorder methods",
      maxMarks: 5,
      keywords: ["binary tree", "inorder", "preorder", "postorder"],
    });
    expect(result.score).toBe(5);
  });

  it("awards partial marks based on keyword coverage", () => {
    const result = gradeDescriptive({
      modelAnswer: "binary tree traversal inorder preorder postorder",
      studentAnswer: "binary tree inorder traversal",
      maxMarks: 4,
      keywords: ["binary tree", "inorder", "preorder", "postorder"],
    });
    // 2 out of 4 keywords present → 50% = 2 marks
    expect(result.score).toBe(2);
    expect(result.keywordsCovered).toBe(2);
    expect(result.totalKeywords).toBe(4);
  });

  it("awards zero for empty student answer", () => {
    const result = gradeDescriptive({
      modelAnswer: "some answer",
      studentAnswer: "",
      maxMarks: 5,
      keywords: ["keyword"],
    });
    expect(result.score).toBe(0);
  });

  it("is case-insensitive for keyword matching", () => {
    const result = gradeDescriptive({
      modelAnswer: "Stack Overflow",
      studentAnswer: "stack overflow occurs when recursion is too deep",
      maxMarks: 2,
      keywords: ["Stack Overflow"],
    });
    expect(result.keywordsCovered).toBe(1);
  });
});

// ── Coding grading ────────────────────────────────────────────────────────────

describe("gradeCoding", () => {
  it("awards full marks when all test cases pass", () => {
    const result = gradeCoding({
      testCaseResults: [
        { passed: true },
        { passed: true },
        { passed: true },
      ],
      maxMarks: 6,
    });
    expect(result.score).toBe(6);
    expect(result.passedCases).toBe(3);
    expect(result.totalCases).toBe(3);
  });

  it("awards partial marks for partial pass", () => {
    const result = gradeCoding({
      testCaseResults: [
        { passed: true },
        { passed: false },
        { passed: true },
      ],
      maxMarks: 6,
    });
    expect(result.score).toBe(4);
    expect(result.passedCases).toBe(2);
  });

  it("awards zero when all test cases fail", () => {
    const result = gradeCoding({
      testCaseResults: [{ passed: false }, { passed: false }],
      maxMarks: 6,
    });
    expect(result.score).toBe(0);
  });

  it("handles empty test cases array", () => {
    const result = gradeCoding({ testCaseResults: [], maxMarks: 5 });
    expect(result.score).toBe(0);
  });
});

// ── Aptitude grading (same as MCQ but explicit) ────────────────────────────────

describe("gradeAptitude", () => {
  it("grades numerically equal answers as correct", () => {
    const result = gradeAptitude({ correctAnswer: "42", studentAnswer: "42", marks: 2 });
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(2);
  });

  it("trims whitespace before comparing", () => {
    const result = gradeAptitude({ correctAnswer: "42", studentAnswer: "  42  ", marks: 2 });
    expect(result.isCorrect).toBe(true);
  });
});

// ── Exam totals ───────────────────────────────────────────────────────────────

describe("calculateExamScore", () => {
  it("sums individual question scores", () => {
    const responses = [
      { score: 2 },
      { score: 0 },
      { score: 3 },
      { score: 1 },
    ];
    expect(calculateExamScore(responses)).toBe(6);
  });

  it("handles negative marking deductions", () => {
    const responses = [{ score: 2 }, { score: -1 }, { score: 3 }];
    expect(calculateExamScore(responses)).toBe(4);
  });

  it("returns zero for empty responses", () => {
    expect(calculateExamScore([])).toBe(0);
  });

  it("never returns a negative total", () => {
    const responses = [{ score: -5 }, { score: -3 }];
    expect(calculateExamScore(responses)).toBeGreaterThanOrEqual(0);
  });
});

// ── Percentage ────────────────────────────────────────────────────────────────

describe("calculatePercentage", () => {
  it("calculates percentage correctly", () => {
    expect(calculatePercentage(45, 60)).toBeCloseTo(75);
  });

  it("returns 0 when total marks is 0", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it("caps at 100 for over-maximum scores", () => {
    expect(calculatePercentage(65, 60)).toBe(100);
  });
});

// ── Grade calculation ─────────────────────────────────────────────────────────

describe("calculateGrade", () => {
  it("returns A+ for >= 90%", () => {
    expect(calculateGrade(92)).toBe("A+");
  });

  it("returns A for >= 80%", () => {
    expect(calculateGrade(85)).toBe("A");
  });

  it("returns B for >= 70%", () => {
    expect(calculateGrade(73)).toBe("B");
  });

  it("returns C for >= 60%", () => {
    expect(calculateGrade(62)).toBe("C");
  });

  it("returns D for >= 50%", () => {
    expect(calculateGrade(55)).toBe("D");
  });

  it("returns F below 50%", () => {
    expect(calculateGrade(45)).toBe("F");
  });

  it("returns F for 0%", () => {
    expect(calculateGrade(0)).toBe("F");
  });
});
