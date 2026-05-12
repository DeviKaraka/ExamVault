/**
 * adaptive-difficulty.ts — Adaptive Examination Engine
 *
 * Implements Item Response Theory (IRT)-inspired difficulty adjustment.
 * Dynamically selects next question difficulty based on student performance.
 *
 * Future Enhancement (as per spec): fully integrate with the live exam flow
 * in exam.tsx to serve questions adaptively.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface PerformanceRecord {
  questionId: string;
  difficulty: DifficultyLevel;
  score: number;
  maxScore: number;
  timeSpentSeconds: number;
}

export interface AdaptiveState {
  currentAbilityEstimate: number; // 0–1, starts at 0.5
  history: PerformanceRecord[];
  recommendedNextDifficulty: DifficultyLevel;
}

// ─── Difficulty Thresholds ───────────────────────────────────────────────────

const DIFFICULTY_WEIGHTS: Record<DifficultyLevel, number> = {
  easy:   0.3,
  medium: 0.6,
  hard:   1.0,
};

// Move up if student scores above this ratio on current difficulty
const PROMOTE_THRESHOLD = 0.75;
// Move down if student scores below this ratio
const DEMOTE_THRESHOLD  = 0.40;
// Minimum questions before first adjustment
const MIN_HISTORY_FOR_ADJUSTMENT = 2;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * initAdaptiveState — create a fresh adaptive session for a student.
 */
export function initAdaptiveState(): AdaptiveState {
  return {
    currentAbilityEstimate: 0.5,
    history: [],
    recommendedNextDifficulty: "medium",
  };
}

/**
 * updateAdaptiveState — call after each question is answered.
 * Returns a new AdaptiveState (pure function, no mutation).
 */
export function updateAdaptiveState(
  state: AdaptiveState,
  record: PerformanceRecord
): AdaptiveState {
  const newHistory = [...state.history, record];

  // Estimate ability as weighted rolling average of recent performance
  const recentN = newHistory.slice(-5); // last 5 questions
  const weightedScores = recentN.map((r) => {
    const ratio = r.score / Math.max(r.maxScore, 1);
    return ratio * DIFFICULTY_WEIGHTS[r.difficulty];
  });

  const avgWeightedScore =
    weightedScores.reduce((a, b) => a + b, 0) /
    Math.max(recentN.length, 1);

  // Normalize to 0–1 range (max possible weighted score = 1.0 for hard)
  const abilityEstimate = Math.min(avgWeightedScore, 1.0);

  // Determine recommended difficulty
  let recommended: DifficultyLevel = state.recommendedNextDifficulty;

  if (newHistory.length >= MIN_HISTORY_FOR_ADJUSTMENT) {
    const lastScore = record.score / Math.max(record.maxScore, 1);

    if (lastScore >= PROMOTE_THRESHOLD) {
      recommended = promoteDifficulty(state.recommendedNextDifficulty);
    } else if (lastScore < DEMOTE_THRESHOLD) {
      recommended = demoteDifficulty(state.recommendedNextDifficulty);
    }
    // Otherwise stay at current difficulty
  }

  return {
    currentAbilityEstimate: abilityEstimate,
    history: newHistory,
    recommendedNextDifficulty: recommended,
  };
}

function promoteDifficulty(current: DifficultyLevel): DifficultyLevel {
  if (current === "easy")   return "medium";
  if (current === "medium") return "hard";
  return "hard"; // already at max
}

function demoteDifficulty(current: DifficultyLevel): DifficultyLevel {
  if (current === "hard")   return "medium";
  if (current === "medium") return "easy";
  return "easy"; // already at min
}

/**
 * getAbilityLabel — human-readable ability band.
 */
export function getAbilityLabel(abilityEstimate: number): string {
  if (abilityEstimate >= 0.75) return "Advanced";
  if (abilityEstimate >= 0.45) return "Intermediate";
  return "Beginner";
}

/**
 * selectNextQuestion — given a pool of question IDs keyed by difficulty,
 * returns the ID of the next question to present.
 */
export function selectNextQuestion(
  state: AdaptiveState,
  pool: Record<DifficultyLevel, string[]>
): string | null {
  const difficulty = state.recommendedNextDifficulty;
  const answeredIds = new Set(state.history.map((r) => r.questionId));

  // Try recommended difficulty first, then fall back
  const fallbackOrder: DifficultyLevel[] =
    difficulty === "hard"
      ? ["hard", "medium", "easy"]
      : difficulty === "medium"
      ? ["medium", "hard", "easy"]
      : ["easy", "medium", "hard"];

  for (const level of fallbackOrder) {
    const candidates = pool[level].filter((id) => !answeredIds.has(id));
    if (candidates.length > 0) {
      // Return the first unanswered question at this level
      return candidates[0];
    }
  }

  return null; // No more questions
}

/**
 * generateAdaptiveSummary — produce a performance report after the exam.
 */
export function generateAdaptiveSummary(state: AdaptiveState): {
  totalQuestions: number;
  abilityEstimate: number;
  abilityLabel: string;
  difficultyBreakdown: Record<DifficultyLevel, { count: number; avgScore: number }>;
} {
  const breakdown: Record<DifficultyLevel, { scores: number[]; count: number }> = {
    easy:   { scores: [], count: 0 },
    medium: { scores: [], count: 0 },
    hard:   { scores: [], count: 0 },
  };

  for (const r of state.history) {
    breakdown[r.difficulty].scores.push(r.score / Math.max(r.maxScore, 1));
    breakdown[r.difficulty].count++;
  }

  const difficultyBreakdown = Object.fromEntries(
    (Object.keys(breakdown) as DifficultyLevel[]).map((level) => {
      const { scores, count } = breakdown[level];
      const avgScore = count > 0
        ? scores.reduce((a, b) => a + b, 0) / count
        : 0;
      return [level, { count, avgScore: Math.round(avgScore * 100) / 100 }];
    })
  ) as Record<DifficultyLevel, { count: number; avgScore: number }>;

  return {
    totalQuestions: state.history.length,
    abilityEstimate: state.currentAbilityEstimate,
    abilityLabel: getAbilityLabel(state.currentAbilityEstimate),
    difficultyBreakdown,
  };
}
