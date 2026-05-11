/**
 * grading.ts
 *
 * ExamVault grading engine.
 * Supports MCQ, descriptive (keyword-based), coding (test-case-based), and aptitude.
 * All functions are pure and fully testable.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type GradeLabel = "A+" | "A" | "B" | "C" | "D" | "F";

export interface MCQGradeParams {
  correctAnswer: string | undefined;
  studentAnswer: string | undefined;
  marks: number;
}

export interface MCQGradeResult {
  score: number;
  isCorrect: boolean;
  isSkipped: boolean;
}

export interface NegativeMarkingParams {
  baseScore: number;
  marks: number;
  negativeFraction: number;   // e.g. 0.25 means deduct 25% of question marks
  isSkipped: boolean;
}

export interface DescriptiveGradeParams {
  modelAnswer: string;
  studentAnswer: string;
  maxMarks: number;
  keywords: string[];
}

export interface DescriptiveGradeResult {
  score: number;
  keywordsCovered: number;
  totalKeywords: number;
  coveragePercent: number;
}

export interface TestCaseResult {
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  executionTimeMs?: number;
}

export interface CodingGradeParams {
  testCaseResults: TestCaseResult[];
  maxMarks: number;
}

export interface CodingGradeResult {
  score: number;
  passedCases: number;
  totalCases: number;
  coveragePercent: number;
}

export interface AptitudeGradeParams {
  correctAnswer: string | undefined;
  studentAnswer: string | undefined;
  marks: number;
}

export interface AptitudeGradeResult {
  score: number;
  isCorrect: boolean;
  isSkipped: boolean;
}

export interface QuestionScore {
  score: number;
}

// ── MCQ grading ───────────────────────────────────────────────────────────────

export function gradeMCQ(params: MCQGradeParams): MCQGradeResult {
  const { correctAnswer, studentAnswer, marks } = params;

  const isSkipped = studentAnswer === undefined || studentAnswer === null || studentAnswer.trim() === "";
  if (isSkipped) {
    return { score: 0, isCorrect: false, isSkipped: true };
  }

  const isCorrect =
    (correctAnswer?.trim().toLowerCase() ?? "") === (studentAnswer?.trim().toLowerCase() ?? "");

  return {
    score: isCorrect ? marks : 0,
    isCorrect,
    isSkipped: false,
  };
}

// ── Negative marking ──────────────────────────────────────────────────────────

export function applyNegativeMarking(params: NegativeMarkingParams): number {
  const { baseScore, marks, negativeFraction, isSkipped } = params;
  if (isSkipped || baseScore > 0) return baseScore;
  // Wrong answer: deduct fraction of marks, never go below -marks
  const deduction = Math.min(marks * negativeFraction, marks);
  return -deduction;
}

// ── Descriptive grading (keyword coverage) ────────────────────────────────────

export function gradeDescriptive(params: DescriptiveGradeParams): DescriptiveGradeResult {
  const { modelAnswer: _modelAnswer, studentAnswer, maxMarks, keywords } = params;

  if (!studentAnswer || studentAnswer.trim() === "") {
    return { score: 0, keywordsCovered: 0, totalKeywords: keywords.length, coveragePercent: 0 };
  }

  const answerLower = studentAnswer.toLowerCase();
  const keywordsCovered = keywords.filter((kw) =>
    answerLower.includes(kw.toLowerCase())
  ).length;

  const totalKeywords = keywords.length;
  const coveragePercent = totalKeywords === 0 ? 100 : (keywordsCovered / totalKeywords) * 100;
  const score = Math.round((coveragePercent / 100) * maxMarks);

  return { score, keywordsCovered, totalKeywords, coveragePercent };
}

// ── Coding grading (test case results) ───────────────────────────────────────

export function gradeCoding(params: CodingGradeParams): CodingGradeResult {
  const { testCaseResults, maxMarks } = params;

  if (testCaseResults.length === 0) {
    return { score: 0, passedCases: 0, totalCases: 0, coveragePercent: 0 };
  }

  const passedCases = testCaseResults.filter((tc) => tc.passed).length;
  const totalCases  = testCaseResults.length;
  const coveragePercent = (passedCases / totalCases) * 100;
  const score = Math.round((passedCases / totalCases) * maxMarks);

  return { score, passedCases, totalCases, coveragePercent };
}

// ── Aptitude grading (numeric / short text) ───────────────────────────────────

export function gradeAptitude(params: AptitudeGradeParams): AptitudeGradeResult {
  const { correctAnswer, studentAnswer, marks } = params;

  const isSkipped = studentAnswer === undefined || studentAnswer === null || studentAnswer.trim() === "";
  if (isSkipped) return { score: 0, isCorrect: false, isSkipped: true };

  const isCorrect =
    (correctAnswer?.trim().toLowerCase() ?? "") === (studentAnswer?.trim().toLowerCase() ?? "");

  return { score: isCorrect ? marks : 0, isCorrect, isSkipped: false };
}

// ── Exam total ────────────────────────────────────────────────────────────────

export function calculateExamScore(responses: QuestionScore[]): number {
  const raw = responses.reduce((sum, r) => sum + (r.score ?? 0), 0);
  return Math.max(0, raw);
}

// ── Percentage ────────────────────────────────────────────────────────────────

export function calculatePercentage(score: number, totalMarks: number): number {
  if (totalMarks === 0) return 0;
  return Math.min(100, Math.round((score / totalMarks) * 100 * 10) / 10);
}

// ── Grade label ───────────────────────────────────────────────────────────────

export function calculateGrade(percentage: number): GradeLabel {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

// ── Full exam evaluation ──────────────────────────────────────────────────────

export interface FullExamResult {
  totalScore: number;
  totalMarks: number;
  percentage: number;
  grade: GradeLabel;
  passed: boolean;
  questionResults: Array<MCQGradeResult | DescriptiveGradeResult | CodingGradeResult | AptitudeGradeResult>;
}

export interface ExamQuestion {
  type: "mcq" | "descriptive" | "coding" | "aptitude" | "verbal";
  marks: number;
  correctAnswer?: string;
  keywords?: string[];
  testCaseResults?: TestCaseResult[];
}

export interface StudentResponse {
  questionId: string;
  answer?: string;
}

export function evaluateExam(
  questions: ExamQuestion[],
  responses: StudentResponse[],
  passingPercentage = 40
): FullExamResult {
  const responseMap = new Map(responses.map((r) => [r.questionId, r.answer]));
  const questionResults: FullExamResult["questionResults"] = [];

  let totalScore = 0;
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  questions.forEach((q, i) => {
    const studentAnswer = responseMap.get(String(i)) ?? "";

    switch (q.type) {
      case "mcq": {
        const res = gradeMCQ({ correctAnswer: q.correctAnswer, studentAnswer, marks: q.marks });
        totalScore += res.score;
        questionResults.push(res);
        break;
      }
      case "descriptive":
      case "verbal": {
        const res = gradeDescriptive({
          modelAnswer: q.correctAnswer ?? "",
          studentAnswer,
          maxMarks: q.marks,
          keywords: q.keywords ?? [],
        });
        totalScore += res.score;
        questionResults.push(res);
        break;
      }
      case "coding": {
        const res = gradeCoding({
          testCaseResults: q.testCaseResults ?? [],
          maxMarks: q.marks,
        });
        totalScore += res.score;
        questionResults.push(res);
        break;
      }
      case "aptitude": {
        const res = gradeAptitude({ correctAnswer: q.correctAnswer, studentAnswer, marks: q.marks });
        totalScore += res.score;
        questionResults.push(res);
        break;
      }
    }
  });

  const finalScore  = Math.max(0, totalScore);
  const percentage  = calculatePercentage(finalScore, totalMarks);
  const grade       = calculateGrade(percentage);

  return {
    totalScore: finalScore,
    totalMarks,
    percentage,
    grade,
    passed: percentage >= passingPercentage,
    questionResults,
  };
}
