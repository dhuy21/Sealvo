export function SoundBackground({ isListening }: { isListening: boolean }) {
  return (
    <>
      {/* Sound Waves Background */}
      <div className="sound-waves">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="sound-wave" />
        ))}
      </div>

      {/* Audio Visualizer Background */}
      <div className="audio-visualizer">
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className="visualizer-bar" />
        ))}
      </div>

      {/* Recording Waves */}
      <div className={`recording-waves ${isListening ? 'active' : ''}`}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="recording-ring" />
        ))}
      </div>
    </>
  );
}
