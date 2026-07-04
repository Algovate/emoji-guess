export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

export function scoreAnswer(baseScore: number, elapsedMs: number, combo: number, hintLevel: number): number {
  const speedBonus = elapsedMs <= 5_000 ? 50 : 0;
  const hintPenalty = [0, 0.15, 0.4, 0.8][hintLevel] ?? 0.8;
  return Math.max(10, Math.round((baseScore + speedBonus) * (1 - hintPenalty) * comboMultiplier(combo)));
}
