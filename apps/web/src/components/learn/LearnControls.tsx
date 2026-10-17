import { LEVELS, levelLabel } from '@sealvo/shared';
import type { LearnMode } from './Flashcard';
import type { VocabMode } from './deck';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function LearnControls({
  selectedLevels,
  onToggleLevel,
  mode,
  onModeChange,
  vocabMode,
  onVocabModeChange,
}: {
  selectedLevels: ReadonlySet<string>;
  onToggleLevel: (level: string) => void;
  mode: LearnMode;
  onModeChange: (mode: LearnMode) => void;
  vocabMode: VocabMode;
  onVocabModeChange: (mode: VocabMode) => void;
}) {
  return (
    <div className={cx(styles, 'flashcard-controls')}>
      <div className={cx(styles, 'flashcard-filters')}>
        <h3>Niveaux</h3>
        <div className={cx(styles, 'filter-options')}>
          <div className={cx(styles, 'filter-row')}>
            {LEVELS.filter((l) => l !== 'v').map((level) => (
              <label key={level} className={cx(styles, 'filter-label')}>
                <input
                  type="checkbox"
                  checked={selectedLevels.has(level)}
                  onChange={() => onToggleLevel(level)}
                />
                <span className={cx(styles, 'custom-checkbox')}></span>
                Niveau {levelLabel(level)}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className={cx(styles, 'mode-selector')}>
        <h3>Mode d&apos;apprentissage</h3>
        <div className={cx(styles, 'mode-options')}>
          <label className={cx(styles, 'mode-label')}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'word-to-meaning'}
              onChange={() => onModeChange('word-to-meaning')}
            />
            <span className={cx(styles, 'custom-radio')}></span>
            Mot → Signification
          </label>
          <label className={cx(styles, 'mode-label')}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'meaning-to-word'}
              onChange={() => onModeChange('meaning-to-word')}
            />
            <span className={cx(styles, 'custom-radio')}></span>
            Signification → Mot
          </label>
        </div>
      </div>

      <div className={cx(styles, 'mode-vocab-selector')}>
        <h3>Mode de vocabulaire</h3>
        <div className={cx(styles, 'mode-options')}>
          <label className={cx(styles, 'mode-label')}>
            <input
              type="radio"
              name="vocab-mode"
              checked={vocabMode === 'today-words'}
              onChange={() => onVocabModeChange('today-words')}
            />
            <span className={cx(styles, 'custom-radio')}></span>
            Mots du jour
          </label>
          <label className={cx(styles, 'mode-label')}>
            <input
              type="radio"
              name="vocab-mode"
              checked={vocabMode === 'all-words'}
              onChange={() => onVocabModeChange('all-words')}
            />
            <span className={cx(styles, 'custom-radio')}></span>
            Tous les mots
          </label>
        </div>
      </div>
    </div>
  );
}
