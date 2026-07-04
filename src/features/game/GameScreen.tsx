import { useEffect, useMemo, useState } from "react";
import type { GameState } from "./types";
import { createAnswerChoices, createLetterTiles } from "./clickAnswer";
import { Mascot } from "../../ui/Mascot";
import { ShareSheet } from "../share/ShareSheet";

interface GameScreenProps {
  state: GameState;
  secondsLeft?: number;
  onSubmit: (answer: string) => void;
  onHint: () => void;
  onSkip: () => void;
  onExit: () => void;
}

const modeNames = { timed: "60 秒快猜", level: "闯关", endless: "无尽", daily: "每日挑战" };

export function GameScreen({ state, secondsLeft, onSubmit, onHint, onSkip, onExit }: GameScreenProps) {
  const question = state.questions[state.index];
  const tiles = useMemo(() => createLetterTiles(question), [question]);
  const choices = useMemo(() => createAnswerChoices(question, state.questions), [question, state.questions]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [hiddenValues, setHiddenValues] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const isChoiceMode = question.difficulty === 1;
  const answerFromIds = (ids: string[]) => ids.map((id) => tiles.find((tile) => tile.id === id)?.value ?? "").join("");
  const selectedTiles = selectedIds.map((id) => tiles.find((tile) => tile.id === id)).filter((tile) => tile !== undefined);
  const selectedAnswer = answerFromIds(selectedIds);

  useEffect(() => {
    setSelectedIds([]);
    setLockedCount(0);
    setHiddenValues([]);
  }, [state.index]);

  useEffect(() => {
    if (state.feedback?.kind !== "wrong") return;
    const timer = window.setTimeout(() => {
      setSelectedIds([]);
      setLockedCount(0);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state.feedback]);

  function chooseTile(id: string) {
    if (state.feedback || selectedIds.includes(id)) return;
    const nextIds = [...selectedIds, id];
    setSelectedIds(nextIds);
    if (nextIds.length === [...question.answer].length) {
      const answer = nextIds.map((tileId) => tiles.find((tile) => tile.id === tileId)?.value ?? "").join("");
      onSubmit(answer);
    }
  }

  function undo() {
    if (selectedIds.length > lockedCount && !state.feedback) setSelectedIds((current) => current.slice(0, -1));
  }

  function clear() {
    if (!state.feedback) setSelectedIds((current) => current.slice(0, lockedCount));
  }

  function requestHint() {
    if (state.feedback || state.hintLevel >= 3) return;
    if (isChoiceMode) {
      const wrong = choices.find((choice) => choice !== question.answer && !hiddenValues.includes(choice));
      if (wrong) setHiddenValues((current) => [...current, wrong]);
    } else {
      const answerCharacters = [...question.answer];
      const nextLockedCount = Math.min(answerCharacters.length - 1, lockedCount + 1);
      if (nextLockedCount > lockedCount) {
        const used = new Set<string>();
        const ids = answerCharacters.slice(0, nextLockedCount).map((character) => {
          const tile = tiles.find((candidate) => candidate.value === character && !used.has(candidate.id));
          if (tile) used.add(tile.id);
          return tile?.id;
        }).filter((id): id is string => Boolean(id));
        setSelectedIds(ids);
        setLockedCount(ids.length);
      } else {
        const distractor = tiles.find((tile) => !answerCharacters.includes(tile.value) && !hiddenValues.includes(tile.value));
        if (distractor) setHiddenValues((current) => [...current, distractor.value]);
      }
    }
    onHint();
  }

  const feedbackMood = state.feedback?.kind === "correct" ? "wow" : state.feedback?.kind === "wrong" ? "comfort" : "thinking";
  return (
    <main className="screen game-screen">
      <header className="game-header">
        <button className="icon-button" onClick={onExit} aria-label="退出本局">←</button>
        <strong>{modeNames[state.mode]}</strong>
        <span className="game-stat">{state.mode === "timed" ? `${secondsLeft ?? 60}s` : state.mode === "endless" ? "❤️".repeat(state.lives) : `${state.index + 1}/${state.questions.length}`}</span>
      </header>
      <div className="game-progress"><span style={{ width: `${state.mode === "timed" ? ((secondsLeft ?? 60) / 60) * 100 : ((state.index + 1) / state.questions.length) * 100}%` }} /></div>
      <section className="score-row">
        <div><small>得分</small><strong>{state.score}</strong></div>
        <div className={state.combo >= 2 ? "combo combo--hot" : "combo"}>🔥 连对 {state.combo}</div>
      </section>
      <section className={`question-card ${state.feedback ? `question-card--${state.feedback.kind}` : ""}`}>
        <span className="difficulty">{"●".repeat(question.difficulty)}{"○".repeat(4 - question.difficulty)}</span>
        <div className="emoji-puzzle" aria-label="Emoji 谜题">{question.emoji}</div>
        <p>{state.hintLevel > 0 ? question.hints[state.hintLevel - 1] : `${question.category} · ${question.answer.length} 个字`}</p>
        <span className="tape tape--one" /><span className="tape tape--two" />
      </section>
      <div className="feedback-slot" aria-live="polite">
        {state.feedback ? <><Mascot mood={feedbackMood} compact /><span><strong>{state.feedback.text}</strong>{state.feedback.gained ? ` +${state.feedback.gained}` : ""}{state.feedback.explanation && <small>{state.feedback.explanation}</small>}</span></> : <span>这题的答案，正在你的脑袋里探头 👀</span>}
      </div>
      <section className="click-answer" aria-label="点击选择答案">
        {isChoiceMode ? (
          <>
            <div className="answer-heading"><strong>选出正确答案</strong><span>点一下就能作答</span></div>
            <div className="choice-grid">
              {choices.map((choice) => (
                <button key={choice} className="answer-choice" disabled={state.feedback !== undefined || hiddenValues.includes(choice)} onClick={() => onSubmit(choice)}>
                  {hiddenValues.includes(choice) ? "已排除" : choice}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="answer-heading"><strong>按顺序拼出答案</strong><span>{selectedAnswer ? "继续点字块" : "点一个字开始"}</span></div>
            <div className="answer-slots" aria-live="polite">
              {[...question.answer].map((_, index) => (
                <span key={index} className={index < lockedCount ? "answer-slot answer-slot--locked" : "answer-slot"}>
                  {selectedTiles[index]?.value ?? ""}
                </span>
              ))}
            </div>
            <div className="letter-grid">
              {tiles.map((tile) => (
                <button key={tile.id} className="letter-tile" disabled={selectedIds.includes(tile.id) || hiddenValues.includes(tile.value) || state.feedback !== undefined} onClick={() => chooseTile(tile.id)}>
                  {hiddenValues.includes(tile.value) ? "×" : tile.value}
                </button>
              ))}
            </div>
            <div className="answer-actions">
              <button onClick={undo} disabled={selectedIds.length <= lockedCount}>撤回一个</button>
              <button onClick={clear} disabled={selectedIds.length <= lockedCount}>重新拼</button>
            </div>
          </>
        )}
      </section>
      <div className="game-tools">
        <button onClick={requestHint} disabled={state.hintLevel >= 3}>💡 帮我一下 {state.hintLevel}/3</button>
        <button onClick={() => setSharing(true)}>↗ 分享这题</button>
        <button onClick={onSkip}>跳过这题 →</button>
      </div>
      {sharing && <ShareSheet question={question} onClose={() => setSharing(false)} />}
    </main>
  );
}
