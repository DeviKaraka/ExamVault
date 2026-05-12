/**
 * grading.ts — ExamVault Grading Engine
 *
 * Supports:
 *  - MCQ / Objective  (instant, with optional negative marking)
 *  - Aptitude         (numerical / logical)
 *  - Coding           (test-case-based)
 *  - Descriptive      (keyword heuristic + Azure OpenAI AI evaluation)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionType = "mcq" | "coding" | "descriptive" | "aptitude";

export interface GradingResult {
  score: number;          // 0–maxScore
  maxScore: number;
  percentage: number;     // 0–100
  feedback: string;
  aiEvaluated: boolean;
  details?: Record<string, unknown>;
}

export interface MCQQuestion {
  type: "mcq";
  correctOption: string;
  negativeMarking?: number; // fraction deducted on wrong answer, e.g. 0.25
  maxScore: number;
}

export interface AptitudeQuestion {
  type: "aptitude";
  correctAnswer: string | number;
  maxScore: number;
}

export interface CodingTestCase {
  input: string;
  expectedOutput: string;
  weight?: number; // relative weight, default 1
}

export interface CodingQuestion {
  type: "coding";
  testCases: CodingTestCase[];
  maxScore: number;
}

export interface DescriptiveQuestion {
  type: "descriptive";
  sampleAnswer: string;
  keywords: string[];          // fallback keyword list
  rubric?: string;             // optional rubric for AI grading
  maxScore: number;
}

export type GradableQuestion =
  | MCQQuestion
  | AptitudeQuestion
  | CodingQuestion
  | DescriptiveQuestion;

// ─── MCQ Grading ─────────────────────────────────────────────────────────────

export function gradeMCQ(
  question: MCQQuestion,
  studentAnswer: string
): GradingResult {
  const correct =
    studentAnswer.trim().toLowerCase() ===
    question.correctOption.trim().toLowerCase();

  let score: number;
  let feedback: string;

  if (correct) {
    score = question.maxScore;
    feedback = "Correct answer.";
  } else if (studentAnswer.trim() === "") {
    score = 0;
    feedback = "No answer provided.";
  } else {
    const deduction = question.negativeMarking
      ? question.maxScore * question.negativeMarking
      : 0;
    score = Math.max(0, -deduction);
    feedback = `Incorrect. Correct answer: ${question.correctOption}.`;
  }

  return {
    score,
    maxScore: question.maxScore,
    percentage: (score / question.maxScore) * 100,
    feedback,
    aiEvaluated: false,
  };
}

// ─── Aptitude Grading ────────────────────────────────────────────────────────

export function gradeAptitude(
  question: AptitudeQuestion,
  studentAnswer: string
): GradingResult {
  const correct =
    String(studentAnswer).trim().toLowerCase() ===
    String(question.correctAnswer).trim().toLowerCase();

  return {
    score: correct ? question.maxScore : 0,
    maxScore: question.maxScore,
    percentage: correct ? 100 : 0,
    feedback: correct
      ? "Correct."
      : `Incorrect. Expected: ${question.correctAnswer}.`,
    aiEvaluated: false,
  };
}

// ─── Coding Grading ──────────────────────────────────────────────────────────

export function gradeCoding(
  question: CodingQuestion,
  studentOutputs: string[]
): GradingResult {
  const { testCases, maxScore } = question;
  const totalWeight = testCases.reduce((sum, tc) => sum + (tc.weight ?? 1), 0);

  let passedWeight = 0;
  const details: Record<string, unknown> = {};

  testCases.forEach((tc, i) => {
    const passed =
      (studentOutputs[i] ?? "").trim() === tc.expectedOutput.trim();
    const weight = tc.weight ?? 1;
    if (passed) passedWeight += weight;
    details[`testCase_${i + 1}`] = { passed, weight };
  });

  const score = (passedWeight / totalWeight) * maxScore;

  return {
    score,
    maxScore,
    percentage: (score / maxScore) * 100,
    feedback: `Passed ${passedWeight} of ${totalWeight} weighted test cases.`,
    aiEvaluated: false,
    details,
  };
}

// ─── Descriptive Grading — Keyword Fallback ──────────────────────────────────

export function gradeDescriptiveKeyword(
  question: DescriptiveQuestion,
  studentAnswer: string
): GradingResult {
  if (!studentAnswer.trim()) {
    return {
      score: 0,
      maxScore: question.maxScore,
      percentage: 0,
      feedback: "No answer provided.",
      aiEvaluated: false,
    };
  }

  const lower = studentAnswer.toLowerCase();
  const matched = question.keywords.filter((kw) =>
    lower.includes(kw.toLowerCase())
  );
  const ratio = matched.length / Math.max(question.keywords.length, 1);
  const score = Math.round(ratio * question.maxScore * 10) / 10;

  return {
    score,
    maxScore: question.maxScore,
    percentage: (score / question.maxScore) * 100,
    feedback: `Keywords matched: ${matched.join(", ") || "none"}.`,
    aiEvaluated: false,
    details: { matchedKeywords: matched, totalKeywords: question.keywords.length },
  };
}

// ─── Descriptive Grading — Azure OpenAI AI Evaluation ────────────────────────

/**
 * gradeDescriptiveAI
 *
 * Sends the question, rubric, sample answer, and student answer to a
 * backend proxy endpoint (/api/evaluate-answer) which calls Azure OpenAI.
 * Falls back to keyword grading if the API call fails.
 */
export async function gradeDescriptiveAI(
  question: DescriptiveQuestion,
  studentAnswer: string
): Promise<GradingResult> {
  if (!studentAnswer.trim()) {
    return {
      score: 0,
      maxScore: question.maxScore,
      percentage: 0,
      feedback: "No answer provided.",
      aiEvaluated: false,
    };
  }

  try {
    const response = await fetch("/api/evaluate-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleAnswer: question.sampleAnswer,
        rubric: question.rubric ?? "Grade based on accuracy, completeness, and clarity.",
        maxScore: question.maxScore,
        studentAnswer,
      }),
    });

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const data: { score: number; feedback: string } = await response.json();

    return {
      score: Math.min(data.score, question.maxScore),
      maxScore: question.maxScore,
      percentage: (Math.min(data.score, question.maxScore) / question.maxScore) * 100,
      feedback: data.feedback,
      aiEvaluated: true,
    };
  } catch (err) {
    console.warn("AI grading failed, falling back to keyword grading:", err);
    return gradeDescriptiveKeyword(question, studentAnswer);
  }
}

// ─── Unified Grader ──────────────────────────────────────────────────────────

/**
 * gradeAnswer — top-level dispatcher.
 * For descriptive questions, uses AI evaluation with keyword fallback.
 */
export async function gradeAnswer(
  question: GradableQuestion,
  studentAnswer: string | string[]
): Promise<GradingResult> {
  switch (question.type) {
    case "mcq":
      return gradeMCQ(question, studentAnswer as string);

    case "aptitude":
      return gradeAptitude(question, studentAnswer as string);

    case "coding":
      return gradeCoding(question, studentAnswer as string[]);

    case "descriptive":
      return gradeDescriptiveAI(question, studentAnswer as string);

    default:
      throw new Error(`Unknown question type`);
  }
}

// ─── Batch Grading ───────────────────────────────────────────────────────────

export interface BatchGradingInput {
  question: GradableQuestion;
  studentAnswer: string | string[];
}

export interface BatchGradingResult {
  totalScore: number;
  totalMaxScore: number;
  totalPercentage: number;
  results: GradingResult[];
}

export async function gradeExamAttempt(
  inputs: BatchGradingInput[]
): Promise<BatchGradingResult> {
  const results = await Promise.all(
    inputs.map(({ question, studentAnswer }) =>
      gradeAnswer(question, studentAnswer)
    )
  );

  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const totalMaxScore = results.reduce((s, r) => s + r.maxScore, 0);

  return {
    totalScore,
    totalMaxScore,
    totalPercentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
    results,
  };
}
