import type { GameMode, PlayerProfile } from "../game/types";
import { xpForNextLevel } from "../game/progression";
import { Mascot } from "../../ui/Mascot";

interface HomeScreenProps {
  profile: PlayerProfile;
  onPlay: (mode: GameMode) => void;
  onProfile: () => void;
  immersive: boolean;
}

const modes: Array<{ id: GameMode; icon: string; title: string; text: string; className: string }> = [
  { id: "timed", icon: "⚡", title: "60 秒快猜", text: "脑洞全开，冲击新纪录", className: "mode-card--hero" },
  { id: "level", icon: "🏁", title: "闯关", text: "10 题拿下 8 题", className: "mode-card--pink" },
  { id: "endless", icon: "❤️", title: "无尽", text: "三颗心能走多远", className: "mode-card--blue" },
  { id: "daily", icon: "📅", title: "每日挑战", text: "今天大家都猜这 10 题", className: "mode-card--mint" },
];

export function HomeScreen({ profile, onPlay, onProfile, immersive }: HomeScreenProps) {
  const levelStart = xpForNextLevel(profile.level - 1);
  const levelEnd = xpForNextLevel(profile.level);
  const progress = Math.min(100, ((profile.xp - levelStart) / Math.max(1, levelEnd - levelStart)) * 100);
  return (
    <main className="screen home-screen">
      <header className="topbar">
        <div className="brand"><span className="brand__mark">猜</span><span>猜猜团</span></div>
        <div className="topbar__actions">
          {!immersive && <button className="icon-button" onClick={() => {
            const url = typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL("game.html") : "/game.html";
            window.open(url);
          }} aria-label="打开沉浸模式">↗</button>}
          <button className="profile-pill" onClick={onProfile}>Lv.{profile.level}</button>
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">今天也来动动脑</p>
          <h1>嗨，等你<br />猜中这一题！</h1>
          <p className="welcome__copy">一分钟就能收获一个“我真聪明”的瞬间。</p>
        </div>
        <div className="mascot-wrap"><span className="speech">准备好啦！</span><Mascot mood="hello" /></div>
      </section>

      <section className="progress-sticker" aria-label={`等级 ${profile.level} 进度 ${Math.round(progress)}%`}>
        <span>今日连玩 <strong>{profile.streakDays} 天</strong></span>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <span>{profile.xp} XP</span>
      </section>

      <section className="mode-grid" aria-label="选择玩法">
        {modes.map((mode) => (
          <button key={mode.id} className={`mode-card ${mode.className}`} onClick={() => onPlay(mode.id)}>
            <span className="mode-card__icon">{mode.icon}</span>
            <span><strong>{mode.title}</strong><small>{mode.text}</small></span>
            <span className="mode-card__arrow">→</span>
          </button>
        ))}
      </section>
    </main>
  );
}
