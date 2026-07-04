import type { PlayerProfile } from "../game/types";

interface ProfileScreenProps { profile: PlayerProfile; onChange: (profile: PlayerProfile) => void; onBack: () => void }

export function ProfileScreen({ profile, onChange, onBack }: ProfileScreenProps) {
  return (
    <main className="screen profile-screen">
      <header className="game-header"><button className="icon-button" onClick={onBack}>←</button><strong>我的贴纸册</strong><span /></header>
      <section className="profile-hero"><span className="profile-level">Lv.{profile.level}</span><h1>脑洞收藏家</h1><p>{profile.xp} XP · 连续挑战 {profile.streakDays} 天</p></section>
      <h2>我的纪录</h2>
      <section className="records">
        <span>⚡<strong>{profile.bestScores.timed}</strong><small>限时最高分</small></span>
        <span>❤️<strong>{profile.bestScores.endless}</strong><small>无尽最高分</small></span>
        <span>📅<strong>{Object.keys(profile.dailyResults).length}</strong><small>完成挑战</small></span>
      </section>
      <h2>换张桌布</h2>
      <section className="theme-picker">
        {(["sunny", "berry", "mint"] as const).map((theme) => <button key={theme} className={`theme-dot theme-dot--${theme}`} aria-label={`切换到 ${theme} 主题`} aria-pressed={profile.themeId === theme} onClick={() => onChange({ ...profile, themeId: theme })} />)}
      </section>
      <label className="toggle-row"><span><strong>减少动态效果</strong><small>让界面安静一点</small></span><input type="checkbox" checked={profile.reducedMotion} onChange={(event) => onChange({ ...profile, reducedMotion: event.target.checked })} /></label>
    </main>
  );
}
