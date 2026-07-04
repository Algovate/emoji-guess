import type { GameMode, GameResult, PlayerProfile } from "../game/types";
import { levelFromXp, xpForResult } from "../game/progression";
import { localDateKey } from "../game/daily";

const KEY = "emoji-guess-profile";
const emptyScores: Record<GameMode, number> = { timed: 0, level: 0, endless: 0, daily: 0 };

export const DEFAULT_PROFILE: PlayerProfile = {
  schemaVersion: 2,
  onboardingCompleted: false,
  level: 1,
  xp: 0,
  streakDays: 0,
  themeId: "sunny",
  reducedMotion: false,
  bestScores: emptyScores,
  dailyResults: {},
  recentQuestionIds: [],
};

async function readRaw(): Promise<unknown> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    return (await chrome.storage.local.get(KEY))[KEY];
  }
  const value = localStorage.getItem(KEY);
  return value ? JSON.parse(value) : undefined;
}

function hasPlayed(value: Partial<PlayerProfile>): boolean {
  return Boolean(
    (value.xp ?? 0) > 0 ||
    value.lastPlayedDate ||
    Object.values(value.bestScores ?? {}).some((score) => (score ?? 0) > 0),
  );
}

export function migrateProfile(raw: unknown): PlayerProfile {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_PROFILE);
  const value = raw as Partial<PlayerProfile> & { schemaVersion?: number };
  return {
    ...structuredClone(DEFAULT_PROFILE),
    ...value,
    schemaVersion: 2,
    onboardingCompleted: value.schemaVersion === 2 ? Boolean(value.onboardingCompleted) : hasPlayed(value),
    bestScores: { ...emptyScores, ...value.bestScores },
    dailyResults: value.dailyResults ?? {},
    recentQuestionIds: Array.isArray(value.recentQuestionIds) ? value.recentQuestionIds : [],
  };
}

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    return migrateProfile(await readRaw());
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [KEY]: profile });
  } else {
    localStorage.setItem(KEY, JSON.stringify(profile));
  }
}

function nextStreak(lastPlayedDate: string | undefined, current: number, today: string, yesterday: string): number {
  if (lastPlayedDate === today) return current;
  if (lastPlayedDate === yesterday) return current + 1;
  return 1;
}

export function recordResult(profile: PlayerProfile, result: GameResult, recentIds: string[]): PlayerProfile {
  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 86_400_000));
  const xp = profile.xp + xpForResult(result.correct, result.score);
  const dailyResults = { ...profile.dailyResults };
  if (result.mode === "daily" && !dailyResults[today]) dailyResults[today] = result;
  return {
    ...profile,
    xp,
    level: levelFromXp(xp),
    streakDays: nextStreak(profile.lastPlayedDate, profile.streakDays, today, yesterday),
    lastPlayedDate: today,
    bestScores: { ...profile.bestScores, [result.mode]: Math.max(profile.bestScores[result.mode], result.score) },
    dailyResults,
    recentQuestionIds: [...new Set([...recentIds, ...profile.recentQuestionIds])].slice(0, 80),
  };
}
