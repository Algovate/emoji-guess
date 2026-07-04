export function levelFromXp(xp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1);
}

export function xpForResult(correct: number, score: number): number {
  return correct * 18 + Math.floor(score / 100);
}

export function xpForNextLevel(level: number): number {
  return level * level * 120;
}
