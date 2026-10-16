/** Randomized once per page load: decorations must not move on each timer re-render. */
const CELESTIAL_STYLES = Array.from({ length: 10 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 8}s`,
  animationDuration: `${6 + Math.random() * 4}s`,
}));

export function StarryBackground() {
  return (
    <>
      {/* Starry Focus Rings */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={`ring-${i}`} className="starry-focus-ring" style={{ animationDelay: `${i * 1.5}s` }} />
      ))}
      {/* Floating Celestial Elements */}
      {CELESTIAL_STYLES.map((style, i) => (
        <div key={`cel-${i}`} className="floating-celestial-element" style={style}>
          ⭐
        </div>
      ))}
    </>
  );
}
