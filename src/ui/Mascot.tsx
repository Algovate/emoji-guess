interface MascotProps {
  mood?: "hello" | "thinking" | "happy" | "wow" | "comfort";
  compact?: boolean;
}

export function Mascot({ mood = "hello", compact = false }: MascotProps) {
  return (
    <div className={`mascot mascot--${mood} ${compact ? "mascot--compact" : ""}`} aria-label={`猜猜团子：${mood}`}>
      <span className="mascot__ear mascot__ear--left" />
      <span className="mascot__ear mascot__ear--right" />
      <span className="mascot__eye mascot__eye--left" />
      <span className="mascot__eye mascot__eye--right" />
      <span className="mascot__mouth" />
      <span className="mascot__blush mascot__blush--left" />
      <span className="mascot__blush mascot__blush--right" />
      {mood === "wow" && <span className="mascot__spark">✦</span>}
    </div>
  );
}
