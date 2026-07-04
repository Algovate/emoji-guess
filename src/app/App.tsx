import { useEffect, useRef, useState } from "react";
import { GameScreen } from "../features/game/GameScreen";
import { ProfileScreen } from "../features/profile/ProfileScreen";
import { ResultScreen } from "../features/results/ResultScreen";
import { QUESTIONS } from "../content/questions";
import { matchesAnswer } from "../features/game/answer";
import { createGame, MODE_CONFIG, pickQuestions, toResult } from "../features/game/game";
import { scoreAnswer } from "../features/game/scoring";
import type { GameMode, GameResult, GameState, PlayerProfile, Screen } from "../features/game/types";
import { DEFAULT_PROFILE, loadProfile, recordResult, saveProfile } from "../features/profile/playerStorage";
import { FirstPlayScreen } from "../features/onboarding/FirstPlayScreen";
import { buildFirstPlayQuestions, recordFirstAnswerLatency } from "../features/onboarding/firstPlay";
import "../styles/app.css";

interface AppProps { immersive?: boolean }

export const CORRECT_FEEDBACK_MS = 700;

export function App({ immersive = false }: AppProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [game, setGame] = useState<GameState>();
  const [result, setResult] = useState<GameResult>();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRecord, setIsRecord] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const gameRef = useRef(game);
  const firstQuestionShownAt = useRef(Date.now());
  gameRef.current = game;

  useEffect(() => {
    void loadProfile().then((loaded) => {
      setProfile(loaded);
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = profile.themeId;
    document.documentElement.dataset.reduceMotion = String(profile.reducedMotion);
  }, [profile.themeId, profile.reducedMotion]);
  useEffect(() => {
    if (hydrated) void saveProfile(profile).catch(() => undefined);
  }, [hydrated, profile]);

  function finish(current: GameState) {
    const nextResult = toResult(current);
    const record = nextResult.score > profile.bestScores[current.mode];
    const nextProfile = recordResult(profile, nextResult, current.questions.map((question) => question.id));
    setProfile(nextProfile); setResult(nextResult); setIsRecord(record); setScreen("result");
  }

  useEffect(() => {
    const initial = gameRef.current;
    if (screen !== "playing" || !initial || initial.mode !== "timed" || !initial.deadline) return;
    const tick = () => {
      const current = gameRef.current;
      if (!current?.deadline) return;
      const left = Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) finish(current);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [screen, game?.mode, game?.deadline]);

  function start(mode: GameMode) {
    const questions = pickQuestions(QUESTIONS, mode, profile.recentQuestionIds);
    const nextGame = createGame(mode, questions);
    gameRef.current = nextGame;
    setGame(nextGame); setSecondsLeft(60); setScreen("playing");
  }

  function startDefault(onboarding: boolean) {
    const regular = pickQuestions(QUESTIONS, "timed", profile.recentQuestionIds);
    const questions = onboarding
      ? [...buildFirstPlayQuestions(QUESTIONS), ...regular.filter((question) => !["q-052", "q-054", "q-053"].includes(question.id))]
      : regular;
    firstQuestionShownAt.current = Date.now();
    const nextGame = createGame("timed", questions, Date.now(), { onboarding });
    gameRef.current = nextGame;
    setGame(nextGame);
    setSecondsLeft(60);
    setScreen("playing");
  }

  useEffect(() => {
    if (hydrated && screen === "home" && !game) startDefault(!profile.onboardingCompleted);
  }, [hydrated, screen, game, profile.onboardingCompleted]);

  function advance(current: GameState): GameState {
    const nextIndex = current.index + 1;
    const shouldFinish = MODE_CONFIG[current.mode].endsBy === "count" && nextIndex >= current.questions.length;
    const now = Date.now();
    const beginsTimedPlay = current.onboarding && nextIndex === 3;
    const next = {
      ...current,
      index: nextIndex,
      hintUsed: false,
      deadline: beginsTimedPlay ? now + 60_000 : current.deadline,
      questionStartedAt: now,
      feedback: undefined,
      finished: shouldFinish,
    };
    if (beginsTimedPlay) {
      setSecondsLeft(60);
      setProfile((currentProfile) => ({ ...currentProfile, onboardingCompleted: true }));
    }
    if (shouldFinish) window.setTimeout(() => finish(next), 350);
    return next;
  }

  function submit(answer: string) {
    const current = gameRef.current;
    if (!current || current.feedback?.kind === "correct") return;
    const question = current.questions[current.index];
    const correct = matchesAnswer(answer, question);
    if (current.onboarding && current.index === 0 && profile.firstAnswerLatencyMs === undefined) {
      const latency = recordFirstAnswerLatency(undefined, firstQuestionShownAt.current, Date.now());
      setProfile((current) => ({ ...current, firstAnswerLatencyMs: latency }));
    }
    if (correct) {
      const nextCombo = current.combo + 1;
      const elapsed = Date.now() - current.questionStartedAt;
      const gained = scoreAnswer(question.baseScore, elapsed, nextCombo, current.hintUsed);
      const next = { ...current, score: current.score + gained, combo: nextCombo, bestCombo: Math.max(current.bestCombo, nextCombo), correct: current.correct + 1, attempts: current.attempts + 1, feedback: { kind: "correct" as const, text: "猜中啦", gained, explanation: question.explanation } };
      gameRef.current = next;
      setGame(next);
      window.setTimeout(() => setGame((latest) => {
        if (!latest) return latest;
        const advanced = advance(latest);
        gameRef.current = advanced;
        return advanced;
      }), CORRECT_FEEDBACK_MS);
    } else {
      const lives = MODE_CONFIG[current.mode].hasLives ? current.lives - 1 : current.lives;
      const next = { ...current, lives, combo: 0, attempts: current.attempts + 1, feedback: { kind: "wrong" as const, text: "不对，再试一次" } };
      gameRef.current = next;
      setGame(next);
      if (lives <= 0) window.setTimeout(() => finish(next), 650);
    }
  }

  function hint() {
    const current = gameRef.current;
    if (!current || current.hintUsed) return;
    const next = { ...current, hintUsed: true, hintsUsed: current.hintsUsed + 1 };
    gameRef.current = next;
    setGame(next);
  }

  function skip() {
    const current = gameRef.current;
    if (!current || current.onboarding && current.index < 3) return;
    const lives = MODE_CONFIG[current.mode].hasLives ? current.lives - 1 : current.lives;
    const next = advance({ ...current, lives, combo: 0 });
    gameRef.current = next;
    if (lives <= 0) finish(next); else setGame(next);
  }

  function updateProfile(next: PlayerProfile) { setProfile(next); }

  return (
    <div className={`app-shell ${immersive ? "app-shell--immersive" : ""}`}>
      {!hydrated && <div className="app-loading" aria-label="正在准备题目" />}
      {screen === "playing" && game?.onboarding && game.index === 0 && <FirstPlayScreen question={game.questions[0]} questions={game.questions} feedback={game.feedback} onAnswer={submit} />}
      {screen === "playing" && game && (!game.onboarding || game.index > 0) && <GameScreen state={game} secondsLeft={secondsLeft} bestScore={profile.bestScores[game.mode]} onSubmit={submit} onHint={hint} onSkip={skip} onExit={() => { setGame(undefined); setScreen("home"); }} />}
      {screen === "result" && result && <ResultScreen result={result} profile={profile} isRecord={isRecord} onAgain={() => start(result.mode)} onDaily={() => start("daily")} onProfile={() => setScreen("profile")} />}
      {screen === "profile" && <ProfileScreen profile={profile} onChange={updateProfile} onBack={() => { setGame(undefined); setScreen("home"); }} />}
    </div>
  );
}
