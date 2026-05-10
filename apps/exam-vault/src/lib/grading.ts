import type { Question } from '@/generated/models/question-model';
import type { Response } from '@/generated/models/response-model';

export interface GradingResult {
  isCorrect: boolean;
  pointsEarned: number;
  feedback: string;
  needsManualReview: boolean;
}

export function autoGradeResponse(
  question: Question,
  response: Partial<Response>
): GradingResult {
  const questionType = question.questionTypeKey;
  const answerText = (response.answerText || '').trim().toLowerCase();
  const correctAnswer = (question.correctAnswer || '').trim().toLowerCase();

  // MCQ - exact match
  if (questionType === 'QuestionTypeKey0') {
    const isCorrect = answerText === correctAnswer;
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.correctAnswer}`,
      needsManualReview: false,
    };
  }

  // Short Text - check for exact match or keyword match
  if (questionType === 'QuestionTypeKey1') {
    // Check exact match first
    if (answerText === correctAnswer) {
      return {
        isCorrect: true,
        pointsEarned: question.points,
        feedback: 'Correct!',
        needsManualReview: false,
      };
    }

    // Check keywords if provided
    if (question.keywords) {
      const keywords = question.keywords.split(',').map((k: string) => k.trim().toLowerCase());
      const matchedKeywords = keywords.filter((kw: string) => answerText.includes(kw));
      const matchRatio = matchedKeywords.length / keywords.length;

      if (matchRatio >= 0.8) {
        return {
          isCorrect: true,
          pointsEarned: question.points,
          feedback: 'Correct! All key concepts identified.',
          needsManualReview: false,
        };
      } else if (matchRatio >= 0.5) {
        return {
          isCorrect: false,
          pointsEarned: Math.round(question.points * matchRatio),
          feedback: `Partially correct. ${matchedKeywords.length}/${keywords.length} key concepts identified.`,
          needsManualReview: true,
        };
      }
    }

    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Incorrect or needs manual review.',
      needsManualReview: true,
    };
  }

  // Reading comprehension - treat like MCQ or short text
  if (questionType === 'QuestionTypeKey4') {
    const isCorrect = answerText === correctAnswer;
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.correctAnswer}`,
      needsManualReview: false,
    };
  }

  // Listening - treat like MCQ or short text
  if (questionType === 'QuestionTypeKey3') {
    const isCorrect = answerText === correctAnswer;
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.correctAnswer}`,
      needsManualReview: false,
    };
  }

  // Code, Writing, Speaking - always need manual review
  if (['QuestionTypeKey2', 'QuestionTypeKey5', 'QuestionTypeKey6'].includes(questionType)) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Pending manual review.',
      needsManualReview: true,
    };
  }

  return {
    isCorrect: false,
    pointsEarned: 0,
    feedback: 'Unknown question type.',
    needsManualReview: true,
  };
}

export function calculateTotalScore(responses: Response[]): {
  autoScore: number;
  totalPossible: number;
  pendingManualReview: number;
} {
  let autoScore = 0;
  let totalPossible = 0;
  let pendingManualReview = 0;

  for (const response of responses) {
    autoScore += response.pointsEarned || 0;
    if (response.gradingStatusKey === 'GradingStatusKey0') {
      pendingManualReview++;
    }
  }

  return { autoScore, totalPossible, pendingManualReview };
}
