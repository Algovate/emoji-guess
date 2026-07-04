import type { Question } from "./types";

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s，。！？、,.!?;；:'"“”‘’《》（）()·—_-]/g, "");
}

export function matchesAnswer(value: string, question: Question): boolean {
  const normalized = normalizeAnswer(value);
  return [question.answer, ...question.aliases].some((candidate) => normalizeAnswer(candidate) === normalized);
}
