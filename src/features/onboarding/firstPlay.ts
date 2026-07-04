import type { GameState, Question } from "../game/types";

const FIRST_PLAY_IDS = ["q-052", "q-054", "q-053"] as const;

const FIRST_PLAY_FALLBACKS: [Question, Question, Question] = [
  {
    id: "onboarding-1", emoji: "✋🐟", answer: "摸鱼", aliases: [],
    hints: ["2 个字 · 热词", "摸", "摸_"], category: "热词",
    difficulty: 1, baseScore: 100, explanation: "上班时偷偷做别的事，像在水里摸鱼。",
  },
  {
    id: "onboarding-2", emoji: "🍉👀", answer: "吃瓜", aliases: [],
    hints: ["2 个字 · 热词", "吃", "吃_"], category: "热词",
    difficulty: 1, baseScore: 100, explanation: "拿着瓜围观，指关注别人的热闹。",
  },
  {
    id: "onboarding-3", emoji: "😭🛡️💥", answer: "破防", aliases: [],
    hints: ["2 个字 · 热词", "破", "破_"], category: "热词",
    difficulty: 2, baseScore: 100, explanation: "心理防线被击破，情绪一下绷不住。",
  },
];

export function buildFirstPlayQuestions(all: Question[]): Question[] {
  const byId = new Map(all.map((question) => [question.id, question]));
  return FIRST_PLAY_IDS.map((id, index) =>
    byId.get(id) ?? structuredClone(FIRST_PLAY_FALLBACKS[index])
  );
}

export function isOnboardingComplete(state: Pick<GameState, "onboarding" | "index">): boolean {
  return state.onboarding && state.index >= 3;
}

export function recordFirstAnswerLatency(
  existing: number | undefined,
  startedAt: number,
  answeredAt: number,
): number {
  return existing ?? Math.max(0, answeredAt - startedAt);
}
