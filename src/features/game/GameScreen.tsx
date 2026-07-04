import { useEffect, useMemo, useState } from "react";
import type { GameState } from "./types";
import { createAnswerChoices, createLetterTiles } from "./clickAnswer";
import { Mascot } from "../../ui/Mascot";
import { ShareSheet } from "../share/ShareSheet";

interface GameScreenProps {
  state: GameState;
  secondsLeft?: number;
  bestScore: number;
  onSubmit: (answer: string) => void;
  onHint: () => void;
  onSkip: () => void;
  onExit: () => void;
}

const modeNames = { timed: "60 秒快猜", level: "闯关", endless: "无尽", daily: "每日挑战" };

export function GameScreen({ state, secondsLeft, bestScore, onSubmit, onHint, onSkip, onExit }: GameScreenProps) {
  const question = state.questions[state.index];
  const tiles = useMemo(() => createLetterTiles(question), [question]);
  const choices = useMemo(() => createAnswerChoices(question, state.questions), [question, state.questions]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [hiddenValues, setHiddenValues] = useState<string[]>([]);
  const [wrongValues, setWrongValues] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const isChoiceMode = question.difficulty === 1;
  const answerFromIds = (ids: string[]) => ids.map((id) => tiles.find((tile) => tile.id === id)?.value ?? "").join("");
  const selectedTiles = selectedIds.map((id) => tiles.find((tile) => tile.id === id)).filter((tile) => tile !== undefined);
  const selectedAnswer = answerFromIds(selectedIds);
  const showStats = state.index >= state.statsVisibleFromIndex;
  const showCombo = showStats && state.combo >= 3;
  const scoreToBest = Math.max(0, bestScore - state.score + 1);

  useEffect(() => {
    if (state.onboarding && state.index === 2) {
      const firstCharacter = [...question.answer][0];
      const firstTile = tiles.find((tile) => tile.value === firstCharacter);
      setSelectedIds(firstTile ? [firstTile.id] : []);
      setLockedCount(firstTile ? 1 : 0);
    } else {
      setSelectedIds([]);
      setLockedCount(0);
    }
    setHiddenValues([]);
    setWrongValues([]);
  }, [state.index, state.onboarding, question, tiles]);

  useEffect(() => {
    if (state.feedback?.kind !== "wrong") return;
    setSelectedIds((current) => current.slice(0, lockedCount));
  }, [state.feedback, lockedCount]);

  function chooseTile(id: string) {
    if (state.feedback?.kind === "correct" || selectedIds.includes(id)) return;
    const nextIds = [...selectedIds, id];
    setSelectedIds(nextIds);
    if (nextIds.length === [...question.answer].length) {
      const answer = nextIds.map((tileId) => tiles.find((tile) => tile.id === tileId)?.value ?? "").join("");
      onSubmit(answer);
    }
  }

  function undo() {
    if (selectedIds.length > lockedCount && state.feedback?.kind !== "correct") setSelectedIds((current) => current.slice(0, -1));
  }

  function clear() {
    if (state.feedback?.kind !== "correct") setSelectedIds((current) => current.slice(0, lockedCount));
  }

  function requestHint() {
    if (state.feedback?.kind === "correct" || state.hintUsed) return;
    if (isChoiceMode) {
      const wrong = choices.filter((choice) => choice !== question.answer && !wrongValues.includes(choice)).slice(0, 2);
      setHiddenValues((current) => [...current, ...wrong]);
    } else {
      const answerCharacters = [...question.answer];
      const nextLockedCount = Math.min(answerCharacters.length, lockedCount + 1);
      if (nextLockedCount > lockedCount) {
        const used = new Set<string>();
        const ids = answerCharacters.slice(0, nextLockedCount).map((character) => {
          const tile = tiles.find((candidate) => candidate.value === character && !used.has(candidate.id));
          if (tile) used.add(tile.id);
          return tile?.id;
        }).filter((id): id is string => Boolean(id));
        setSelectedIds(ids);
        setLockedCount(ids.length);
        if (ids.length === answerCharacters.length) {
          window.setTimeout(() => onSubmit(question.answer), 0);
        }
      }
    }
    onHint();
  }

  const feedbackMood = state.feedback?.kind === "correct" ? "wow" : state.feedback?.kind === "wrong" ? "comfort" : "thinking";
  return (
    <main className="screen game-screen">
      <header className="game-header">
        <button className="icon-button" onClick={onExit} aria-label="退出本局">←</button>
        <strong>{state.onboarding && !showStats ? "先热热身" : modeNames[state.mode]}</strong>
        <span className="game-stat">{showStats ? state.mode === "timed" ? `${secondsLeft ?? 60}s` : state.mode === "endless" ? "❤️".repeat(state.lives) : `${state.index + 1}/${state.questions.length}` : `${state.index + 1}/3`}</span>
      </header>
      {showStats && <div className="game-progress"><span style={{ width: `${state.mode === "timed" ? ((secondsLeft ?? 60) / 60) * 100 : ((state.index + 1) / state.questions.length) * 100}%` }} /></div>}
      {showStats && <section className="score-row">
        <div><small>得分</small><strong>{state.score}</strong><em>{scoreToBest > 0 ? `再得 ${scoreToBest} 分刷新最佳` : "已刷新最佳"}</em></div>
        {showCombo && <div className="combo combo--hot">连对 {state.combo}</div>}
      </section>}
      <section className={`question-card ${state.feedback ? `question-card--${state.feedback.kind}` : ""}`}>
        <span className="difficulty">{"●".repeat(question.difficulty)}{"○".repeat(4 - question.difficulty)}</span>
        <div className="emoji-puzzle" aria-label="Emoji 谜题">{question.emoji}</div>
        <p>{question.category} · {question.answer.length} 个字</p>
        <span className="tape tape--one" /><span className="tape tape--two" />
      </section>
      <div className="feedback-slot" aria-live="polite">
        {state.feedback ? <><Mascot mood={feedbackMood} compact /><span><strong>{state.feedback.text}</strong>{state.feedback.gained ? ` +${state.feedback.gained}` : ""}{state.feedback.kind === "correct" && state.feedback.explanation && <small>{state.feedback.explanation}</small>}</span></> : <span>{state.onboarding && !showStats ? "凭第一感觉就好。" : "看懂了就点，不用想太久。"}</span>}
      </div>
      <section className="click-answer" aria-label="点击选择答案">
        {isChoiceMode ? (
          <>
            <div className="answer-heading"><strong>选出正确答案</strong><span>点一下就能作答</span></div>
            <div className="choice-grid">
              {choices.map((choice) => (
                <button
                  key={choice}
                  className={`answer-choice ${wrongValues.includes(choice) ? "answer-choice--wrong" : ""} ${state.feedback?.kind === "correct" && choice === question.answer ? "answer-choice--correct" : ""}`}
                  disabled={state.feedback?.kind === "correct" || hiddenValues.includes(choice) || wrongValues.includes(choice)}
                  onClick={() => {
                    if (choice !== question.answer) setWrongValues((current) => [...current, choice]);
                    onSubmit(choice);
                  }}
                >
                  {hiddenValues.includes(choice) ? "已排除" : wrongValues.includes(choice) ? `× ${choice}` : state.feedback?.kind === "correct" && choice === question.answer ? `✓ ${choice}` : choice}
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
                <button key={tile.id} className="letter-tile" disabled={selectedIds.includes(tile.id) || hiddenValues.includes(tile.value) || state.feedback?.kind === "correct"} onClick={() => chooseTile(tile.id)}>
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
        <button onClick={requestHint} disabled={state.hintUsed}>💡 帮我一步</button>
        {showStats && <button onClick={() => setSharing(true)}>↗ 分享这题</button>}
        {showStats && <button onClick={onSkip}>跳过这题 →</button>}
      </div>
      {sharing && <ShareSheet question={question} onClose={() => setSharing(false)} />}
    </main>
  );
}
