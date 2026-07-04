export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

export function scoreAnswer(baseScore: number, elapsedMs: number, combo: number, hintUsed: boolean): number {
  const speedBonus = !hintUsed && elapsedMs <= 5_000 ? 50 : 0;
  return Math.max(10, (baseScore + speedBonus) * comboMultiplier(combo));
}
