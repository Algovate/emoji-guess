import { describe, expect, it } from "vitest";
import { matchesAnswer, normalizeAnswer } from "../features/game/answer";
import { comboMultiplier, scoreAnswer } from "../features/game/scoring";
import { dailyQuestions } from "../features/game/daily";
import { QUESTIONS, validateQuestions } from "../content/questions";
import { createAnswerChoices, createLetterTiles } from "../features/game/clickAnswer";
import { buildQuestionShareText, buildResultShareText } from "../features/share/shareCard";

describe("answer matching", () => {
  it("normalizes spaces, punctuation, width and case", () => {
    expect(normalizeAnswer(" Ａpple！ ")).toBe("apple");
  });
  it("accepts exact aliases", () => {
    expect(matchesAnswer("猫咪咖啡馆", { ...QUESTIONS[0], answer: "猫咖", aliases: ["猫咪咖啡馆"] })).toBe(true);
  });
});

describe("scoring", () => {
  it("applies speed and combo bonuses", () => {
    expect(comboMultiplier(10)).toBe(3);
    expect(scoreAnswer(100, 4000, 10, false)).toBe(450);
  });
  it("keeps a minimum score after hints", () => {
    expect(scoreAnswer(10, 9000, 1, true)).toBe(10);
  });
  it("removes only the speed bonus after a hint", () => {
    expect(scoreAnswer(100, 4000, 1, false)).toBe(150);
    expect(scoreAnswer(100, 4000, 1, true)).toBe(100);
  });
});

describe("question bank", () => {
  it("contains exactly 500 valid questions", () => {
    expect(QUESTIONS).toHaveLength(500);
    expect(validateQuestions(QUESTIONS)).toEqual([]);
    expect(new Set(QUESTIONS.map((question) => question.answer)).size).toBe(500);
    expect(QUESTIONS.every((question) => question.explanation.length >= 8)).toBe(true);
    expect(new Set(QUESTIONS.map((question) => question.category)).size).toBe(10);
  });
  it("generates deterministic daily sets", () => {
    expect(dailyQuestions(QUESTIONS, "2026-07-04").map((q) => q.id)).toEqual(dailyQuestions(QUESTIONS, "2026-07-04").map((q) => q.id));
  });
});

describe("click-only answers", () => {
  it("builds deterministic tiles containing every answer character", () => {
    const question = { ...QUESTIONS[0], answer: "猫咖", difficulty: 2 as const };
    const tiles = createLetterTiles(question);
    expect(tiles).toEqual(createLetterTiles(question));
    expect(tiles.map((tile) => tile.value)).toEqual(expect.arrayContaining(["猫", "咖"]));
    expect(tiles.length).toBeGreaterThanOrEqual(6);
  });

  it("builds four choices with the correct answer exactly once", () => {
    const choices = createAnswerChoices(QUESTIONS[0], QUESTIONS);
    expect(choices).toHaveLength(4);
    expect(choices.filter((answer) => answer === QUESTIONS[0].answer)).toHaveLength(1);
  });

  it("keeps every answer choice the same length", () => {
    const question = QUESTIONS.find((candidate) => candidate.id === "q-052")!;
    expect(createAnswerChoices(question, QUESTIONS).every((answer) => answer.length === question.answer.length)).toBe(true);
  });
});

describe("share content", () => {
  it("shares the puzzle without leaking its answer", () => {
    const question = { ...QUESTIONS[0], emoji: "🐱☕", answer: "猫咖", category: "生活" as const };
    const text = buildQuestionShareText(question);
    expect(text).toContain("🐱☕");
    expect(text).toContain("2 个字");
    expect(text).not.toContain("猫咖");
  });

  it("shares result metrics", () => {
    const text = buildResultShareText({ mode: "timed", score: 1280, correct: 9, attempts: 11, bestCombo: 6, elapsedSeconds: 60, hintsUsed: 1 });
    expect(text).toContain("1280");
    expect(text).toContain("答对 9 题");
    expect(text).toContain("最高连击 6");
  });
});
