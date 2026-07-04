import { useEffect, useRef, useState } from "react";
import { HomeScreen } from "../features/home/HomeScreen";
import { GameScreen } from "../features/game/GameScreen";
import { ProfileScreen } from "../features/profile/ProfileScreen";
import { ResultScreen } from "../features/results/ResultScreen";
import { QUESTIONS } from "../content/questions";
import { matchesAnswer } from "../features/game/answer";
import { createGame, MODE_CONFIG, pickQuestions, toResult } from "../features/game/game";
import { scoreAnswer } from "../features/game/scoring";
import type { GameMode, GameResult, GameState, PlayerProfile, Screen } from "../features/game/types";
import { DEFAULT_PROFILE, loadProfile, recordResult, saveProfile } from "../features/profile/playerStorage";
import "../styles/app.css";

interface AppProps { immersive?: boolean }

const encouragement = {
  quick: ["这脑回路开了闪电！", "啪！一秒接住答案！", "团子还没眨眼，你就会了！"],
  combo: ["你已经猜疯啦，根本拦不住！", "连击起飞，脑洞有火花！", "这手感，稳稳拿捏！"],
  normal: ["猜中啦！给聪明的你贴朵小红花。", "就是它！这题没能难住你。", "漂亮！脑袋里的灯又亮一盏。"],
  wrong: ["方向很近，再拐一个小弯。", "没关系，答案正在跟你捉迷藏。", "差一点点，再看看 Emoji。"],
};

function sample(values: string[]): string { return values[Math.floor(Math.random() * values.length)]; }

export function App({ immersive = false }: AppProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [game, setGame] = useState<GameState>();
  const [result, setResult] = useState<GameResult>();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRecord, setIsRecord] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const gameRef = useRef(game);
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
    if (hydrated) void saveProfile(profile);
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
    setGame(createGame(mode, questions)); setSecondsLeft(60); setScreen("playing");
  }

  function advance(current: GameState): GameState {
    const nextIndex = current.index + 1;
    const shouldFinish = MODE_CONFIG[current.mode].endsBy === "count" && nextIndex >= current.questions.length;
    const next = { ...current, index: nextIndex, hintLevel: 0 as const, questionStartedAt: Date.now(), feedback: undefined, finished: shouldFinish };
    if (shouldFinish) window.setTimeout(() => finish(next), 350);
    return next;
  }

  function submit(answer: string) {
    if (!game || game.feedback) return;
    const question = game.questions[game.index];
    const correct = matchesAnswer(answer, question);
    if (correct) {
      const nextCombo = game.combo + 1;
      const elapsed = Date.now() - game.questionStartedAt;
      const gained = scoreAnswer(question.baseScore, elapsed, nextCombo, game.hintLevel);
      const text = sample(nextCombo >= 5 ? encouragement.combo : elapsed <= 5000 ? encouragement.quick : encouragement.normal);
      const next = { ...game, score: game.score + gained, combo: nextCombo, bestCombo: Math.max(game.bestCombo, nextCombo), correct: game.correct + 1, attempts: game.attempts + 1, feedback: { kind: "correct" as const, text, gained, explanation: question.explanation } };
      setGame(next);
      window.setTimeout(() => setGame((latest) => latest ? advance(latest) : latest), 2_200);
    } else {
      const lives = MODE_CONFIG[game.mode].hasLives ? game.lives - 1 : game.lives;
      const next = { ...game, lives, combo: 0, attempts: game.attempts + 1, feedback: { kind: "wrong" as const, text: sample(encouragement.wrong) } };
      setGame(next);
      if (lives <= 0) window.setTimeout(() => finish(next), 650);
      else window.setTimeout(() => setGame((latest) => latest ? { ...latest, feedback: undefined } : latest), 700);
    }
  }

  function hint() {
    setGame((current) => {
      if (!current || current.hintLevel >= 3) return current;
      return { ...current, hintLevel: (current.hintLevel + 1) as 1 | 2 | 3, hintsUsed: current.hintsUsed + 1 };
    });
  }

  function skip() {
    if (!game) return;
    const lives = MODE_CONFIG[game.mode].hasLives ? game.lives - 1 : game.lives;
    const next = advance({ ...game, lives, combo: 0 });
    if (lives <= 0) finish(next); else setGame(next);
  }

  function updateProfile(next: PlayerProfile) { setProfile(next); }

  return (
    <div className={`app-shell ${immersive ? "app-shell--immersive" : ""}`}>
      {screen === "home" && <HomeScreen profile={profile} onPlay={start} onProfile={() => setScreen("profile")} immersive={immersive} />}
      {screen === "playing" && game && <GameScreen state={game} secondsLeft={secondsLeft} onSubmit={submit} onHint={hint} onSkip={skip} onExit={() => setScreen("home")} />}
      {screen === "result" && result && <ResultScreen result={result} profile={profile} isRecord={isRecord} onAgain={() => start(result.mode)} onHome={() => setScreen("home")} />}
      {screen === "profile" && <ProfileScreen profile={profile} onChange={updateProfile} onBack={() => setScreen("home")} />}
    </div>
  );
}
