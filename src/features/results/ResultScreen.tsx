import { useState } from "react";
import type { GameResult, PlayerProfile } from "../game/types";
import { xpForResult } from "../game/progression";
import { Mascot } from "../../ui/Mascot";
import { ShareSheet } from "../share/ShareSheet";

interface ResultScreenProps {
  result: GameResult;
  profile: PlayerProfile;
  isRecord: boolean;
  onAgain: () => void;
  onDaily: () => void;
  onProfile: () => void;
}

export function ResultScreen({ result, profile, isRecord, onAgain, onDaily, onProfile }: ResultScreenProps) {
  const [sharing, setSharing] = useState(false);
  const accuracy = result.attempts ? Math.round((result.correct / result.attempts) * 100) : 0;
  const title = isRecord ? "新纪录诞生！" : result.correct >= 8 ? "脑洞全开！" : result.correct >= 4 ? "状态越来越好！" : "热身完成！";
  const copy = isRecord ? "今天的你，认真超过了昨天的自己。" : result.correct >= 8 ? "这波解题速度，团子看得目瞪口呆。" : "每猜一题，脑洞就多开一扇窗。";
  return (
    <main className="screen result-screen">
      <div className="confetti" aria-hidden="true">✦ ● ★ ◆ ✦</div>
      <Mascot mood="happy" />
      <p className="eyebrow">本局完成</p>
      <h1>{title}</h1><p>{copy}</p>
      <section className="score-ticket">
        <div className="score-ticket__main"><small>本局得分</small><strong>{result.score}</strong></div>
        <div><span><strong>{result.correct}</strong><small>答对</small></span><span><strong>{accuracy}%</strong><small>准确率</small></span><span><strong>{result.bestCombo}</strong><small>最高连击</small></span></div>
        <p>+{xpForResult(result.correct, result.score)} XP · 当前 Lv.{profile.level}</p>
      </section>
      <div className="result-actions">
        <button className="primary-button primary-button--wide" onClick={onAgain}>再玩一局</button>
      </div>
      <div className="result-secondary-actions">
        <button onClick={onDaily}>每日挑战</button>
        <button onClick={() => setSharing(true)}>晒成绩</button>
        <button onClick={onProfile}>查看档案</button>
      </div>
      {sharing && <ShareSheet result={result} onClose={() => setSharing(false)} />}
    </main>
  );
}
