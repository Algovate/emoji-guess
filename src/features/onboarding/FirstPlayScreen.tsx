import { useMemo, useState } from "react";
import type { GameState, Question } from "../game/types";
import { createAnswerChoices } from "../game/clickAnswer";

interface FirstPlayScreenProps {
  question: Question;
  questions: Question[];
  feedback?: GameState["feedback"];
  onAnswer: (answer: string) => void;
}

export function FirstPlayScreen({ question, questions, feedback, onAnswer }: FirstPlayScreenProps) {
  const choices = useMemo(() => createAnswerChoices(question, questions), [question, questions]);
  const [wrongChoices, setWrongChoices] = useState<string[]>([]);
  const correct = feedback?.kind === "correct";

  function answer(choice: string) {
    if (correct || wrongChoices.includes(choice)) return;
    if (choice !== question.answer) setWrongChoices((current) => [...current, choice]);
    onAnswer(choice);
  }

  return (
    <main className="screen first-play-screen">
      <header className="first-play-brand">
        <span className="brand__mark">猜</span>
        <strong>猜猜团</strong>
      </header>

      <section className={`first-play-question ${correct ? "first-play-question--correct" : ""}`}>
        <p>{question.category} · {question.answer.length} 个字</p>
        <div className="emoji-puzzle" aria-label="由多个表情组成的谜题">{question.emoji}</div>
      </section>

      <section className="first-play-answer" aria-label="选择答案">
        <div className="first-play-heading">
          <h1>{correct ? "猜中啦" : "选出答案"}</h1>
          <p>{correct ? "就这么简单，继续猜。" : "凭第一感觉，点一下。"}</p>
        </div>
        <div className="choice-grid">
          {choices.map((choice) => {
            const wrong = wrongChoices.includes(choice);
            const isCorrect = correct && choice === question.answer;
            return (
              <button
                key={choice}
                className={`answer-choice ${wrong ? "answer-choice--wrong" : ""} ${isCorrect ? "answer-choice--correct" : ""}`}
                disabled={correct || wrong}
                onClick={() => answer(choice)}
              >
                {wrong ? `× ${choice}` : isCorrect ? `✓ ${choice}` : choice}
              </button>
            );
          })}
        </div>
        <p className="first-play-feedback" aria-live="polite">
          {feedback?.kind === "wrong" ? "不对，再试一个。" : correct ? question.explanation : ""}
        </p>
      </section>
    </main>
  );
}
