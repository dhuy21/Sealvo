/** Randomized once per page load: decorations must not move on each timer re-render. */
const ORB_STYLES = Array.from({ length: 14 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  width: `${40 + Math.random() * 80}px`,
  height: `${40 + Math.random() * 80}px`,
  opacity: 0.3 + Math.random() * 0.5,
  animationDuration: `${15 + Math.random() * 25}s`,
}));

const STAR_STYLES = Array.from({ length: 15 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  fontSize: `${12 + Math.random() * 12}px`,
  opacity: 0.3 + Math.random() * 0.7,
  animationDelay: `${Math.random() * 8}s`,
  animationDuration: `${2 + Math.random() * 6}s`,
}));

export function MagicalBackground() {
  return (
    <div className="magical-background">
      {ORB_STYLES.map((style, i) => (
        <div key={`orb-${i}`} className="magic-orb" style={style} />
      ))}
      {STAR_STYLES.map((style, i) => (
        <div key={`star-${i}`} className="magic-star" style={style}>
          🌟
        </div>
      ))}
    </div>
  );
}
