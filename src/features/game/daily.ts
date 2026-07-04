import type { Question } from "./types";
import { shuffled } from "./random";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dailyQuestions(all: Question[], dateKey: string, count = 10): Question[] {
  return shuffled(all, `emoji-guess-v1:${dateKey}`).slice(0, count);
}
