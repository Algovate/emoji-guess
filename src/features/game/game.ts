import type { GameMode, GameResult, GameState, Question } from "./types";
import { dailyQuestions, localDateKey } from "./daily";

export interface ModeConfig {
  questionCount: number;
  hasLives: boolean;
  endsBy: "count" | "lives" | "deadline";
  durationMs?: number;
}

export const MODE_CONFIG: Record<GameMode, ModeConfig> = {
  timed: { questionCount: 40, hasLives: false, endsBy: "deadline", durationMs: 60_000 },
  level: { questionCount: 10, hasLives: false, endsBy: "count" },
  endless: { questionCount: 60, hasLives: true, endsBy: "lives" },
  daily: { questionCount: 10, hasLives: false, endsBy: "count" },
};

export function pickQuestions(all: Question[], mode: GameMode, recent: string[]): Question[] {
  if (mode === "daily") return dailyQuestions(all, localDateKey(), MODE_CONFIG.daily.questionCount);
  const available = all.filter((question) => !recent.includes(question.id));
  const pool = available.length >= 30 ? available : all;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MODE_CONFIG[mode].questionCount);
}

export function createGame(
  mode: GameMode,
  questions: Question[],
  now = Date.now(),
  options: { onboarding?: boolean } = {},
): GameState {
  const config = MODE_CONFIG[mode];
  const onboarding = options.onboarding ?? false;
  return {
    mode, questions, index: 0, score: 0, combo: 0, bestCombo: 0, correct: 0, attempts: 0,
    lives: 3, hintsUsed: 0, hintUsed: false, onboarding, statsVisibleFromIndex: onboarding ? 3 : 0, startedAt: now,
    deadline: config.durationMs && !onboarding ? now + config.durationMs : undefined,
    questionStartedAt: now, finished: false,
  };
}

export function toResult(state: GameState, now = Date.now()): GameResult {
  return {
    mode: state.mode, score: state.score, correct: state.correct, attempts: state.attempts,
    bestCombo: state.bestCombo, elapsedSeconds: Math.max(1, Math.round((now - state.startedAt) / 1000)),
    hintsUsed: state.hintsUsed,
  };
}
