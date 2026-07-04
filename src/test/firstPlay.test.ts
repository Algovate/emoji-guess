import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../content/questions";
import { buildFirstPlayQuestions, isOnboardingComplete, recordFirstAnswerLatency } from "../features/onboarding/firstPlay";

describe("first play", () => {
  it("returns a stable curated sequence", () => {
    expect(buildFirstPlayQuestions(QUESTIONS).map(({ id, answer, difficulty }) => [id, answer, difficulty])).toEqual([
      ["q-052", "摸鱼", 1],
      ["q-054", "吃瓜", 1],
      ["q-053", "破防", 2],
    ]);
  });

  it("uses safe fallback questions", () => {
    expect(buildFirstPlayQuestions([]).map((question) => question.answer)).toEqual(["摸鱼", "吃瓜", "破防"]);
  });

  it("completes after three onboarding questions", () => {
    expect(isOnboardingComplete({ onboarding: true, index: 2 })).toBe(false);
    expect(isOnboardingComplete({ onboarding: true, index: 3 })).toBe(true);
  });

  it("records only the first latency", () => {
    expect(recordFirstAnswerLatency(undefined, 1_000, 4_200)).toBe(3_200);
    expect(recordFirstAnswerLatency(3_200, 1_000, 9_000)).toBe(3_200);
  });
});
