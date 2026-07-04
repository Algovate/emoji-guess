import type { Question } from "./types";
import { shuffled } from "./random";

export interface LetterTile {
  id: string;
  value: string;
}

const distractors = [..."天地人心花月风雨山海猫狗鱼鸟火水星云大小上下左右春夏秋冬吃喝玩乐爱笑跑走"];

export function createLetterTiles(question: Question): LetterTile[] {
  const answerCharacters = [...question.answer];
  const targetCount = Math.min(12, Math.max(6, answerCharacters.length + question.difficulty + 2));
  const pool = shuffled(distractors.filter((value) => !answerCharacters.includes(value)), question.id);
  const values = [...answerCharacters, ...pool.slice(0, targetCount - answerCharacters.length)];
  return shuffled(values.map((value, index) => ({ id: `${question.id}-${index}`, value })), `${question.id}:tiles`);
}

export function createAnswerChoices(question: Question, allQuestions: Question[]): string[] {
  const alternatives = shuffled(
    [...new Set(allQuestions.filter((candidate) => candidate.category === question.category && candidate.id !== question.id && candidate.answer.length === question.answer.length).map((candidate) => candidate.answer))],
    `${question.id}:choices`,
  ).slice(0, 3);
  if (alternatives.length < 3) {
    const pool = [...new Set(allQuestions.filter((candidate) => candidate.id !== question.id).map((candidate) => candidate.answer))];
    const fallback = shuffled(pool, `${question.id}:fallback`)
      .filter((value) => value !== question.answer && !alternatives.includes(value))
      .slice(0, 3 - alternatives.length);
    alternatives.push(...fallback);
  }
  return shuffled([question.answer, ...alternatives], `${question.id}:final`);
}
