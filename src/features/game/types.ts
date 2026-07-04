export type GameMode = "timed" | "level" | "endless" | "daily";
export type Category = "生活" | "动作" | "成语" | "电影" | "歌曲" | "城市" | "节日" | "食物" | "动物" | "职业" | "自然" | "情绪" | "热词";
export type Screen = "home" | "playing" | "result" | "profile";

export interface Question {
  id: string;
  emoji: string;
  answer: string;
  aliases: string[];
  hints: [string, string, string];
  category: Category;
  difficulty: 1 | 2 | 3 | 4;
  baseScore: number;
  explanation: string;
  distractors?: [string, string, string];
}

export interface GameResult {
  mode: GameMode;
  score: number;
  correct: number;
  attempts: number;
  bestCombo: number;
  elapsedSeconds: number;
  hintsUsed: number;
}

export interface PlayerProfile {
  schemaVersion: 2;
  onboardingCompleted: boolean;
  firstAnswerLatencyMs?: number;
  level: number;
  xp: number;
  streakDays: number;
  lastPlayedDate?: string;
  themeId: "sunny" | "berry" | "mint";
  reducedMotion: boolean;
  bestScores: Record<GameMode, number>;
  dailyResults: Record<string, GameResult>;
  recentQuestionIds: string[];
}

export interface GameState {
  mode: GameMode;
  questions: Question[];
  index: number;
  score: number;
  combo: number;
  bestCombo: number;
  correct: number;
  attempts: number;
  lives: number;
  hintsUsed: number;
  hintUsed: boolean;
  onboarding: boolean;
  statsVisibleFromIndex: number;
  startedAt: number;
  deadline?: number;
  questionStartedAt: number;
  feedback?: { kind: "correct" | "wrong"; text: string; gained?: number; explanation?: string };
  finished: boolean;
}
