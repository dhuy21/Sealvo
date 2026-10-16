import { LEVELS, levelLabel } from './levels';
import type { LearnMode } from './Flashcard';

export function LearnControls({
  selectedLevels,
  onToggleLevel,
  mode,
  onModeChange,
}: {
  selectedLevels: Set<string>;
  onToggleLevel: (level: string) => void;
  mode: LearnMode;
  onModeChange: (mode: LearnMode) => void;
}) {
  return (
    <div className="flashcard-controls">
      <div className="flashcard-filters">
        <h3>Niveaux</h3>
        <div className="filter-options">
          <div className="filter-row">
            {LEVELS.filter((l) => l !== 'v').map((level) => (
              <label key={level} className="filter-label">
                <input
                  type="checkbox"
                  checked={selectedLevels.has(level)}
                  onChange={() => onToggleLevel(level)}
                />
                <span className="custom-checkbox"></span>
                Niveau {levelLabel(level)}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mode-selector">
        <h3>Mode d&apos;apprentissage</h3>
        <div className="mode-options">
          <label className="mode-label">
            <input
              type="radio"
              name="mode"
              checked={mode === 'word-to-meaning'}
              onChange={() => onModeChange('word-to-meaning')}
            />
            <span className="custom-radio"></span>
            Mot → Signification
          </label>
          <label className="mode-label">
            <input
              type="radio"
              name="mode"
              checked={mode === 'meaning-to-word'}
              onChange={() => onModeChange('meaning-to-word')}
            />
            <span className="custom-radio"></span>
            Signification → Mot
          </label>
        </div>
      </div>
    </div>
  );
}
