import type { RefObject } from 'react';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/speed-vocab.module.css';

export interface SpeedVocabFlags {
  energetic: boolean;
  wordFadeIn: boolean;
  streakCelebration: boolean;
  inputFeedback: 'correct' | 'incorrect' | '';
}

export function SpeedVocabBoard({
  currentWord,
  score,
  streak,
  timer,
  input,
  inputRef,
  speedLinesRef,
  flags,
  onInput,
}: {
  currentWord: { word: string; meaning: string };
  score: number;
  streak: number;
  timer: number;
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  speedLinesRef: RefObject<HTMLDivElement | null>;
  flags: SpeedVocabFlags;
  onInput: (value: string) => void;
}) {
  const inputClass =
    flags.inputFeedback === 'incorrect'
      ? cx(styles, 'incorrect-shake', 'incorrect')
      : cx(styles, flags.inputFeedback);

  return (
    <div className={cx(styles, 'screen', 'active-game-screen', 'active', 'game-active')}>
      <div className={cx(styles, 'game-info')}>
        <div className={cx(styles, 'score-display')}>
          <div className={cx(styles, 'score-label')}>Score</div>
          <div id="score" className={cx(styles, 'score-value')}>
            {score}
          </div>
        </div>
        <div className={cx(styles, 'timer-display')}>
          <div className={cx(styles, 'timer-label')}>Temps</div>
          <div id="timer" className={cx(styles, 'timer-value', timer <= 50 && 'warning')}>
            {timer}
          </div>
        </div>
        <div
          className={cx(styles, 'streak-display', flags.streakCelebration && 'streak-celebration')}
        >
          <div className={cx(styles, 'streak-label')}>Série</div>
          <div id="streak" className={cx(styles, 'streak-value')}>
            {streak}
          </div>
        </div>
      </div>

      <div className={cx(styles, 'word-container', flags.energetic && 'energetic')}>
        <div id="word-display" className={flags.wordFadeIn ? styles['fadeIn'] : undefined}>
          {currentWord.word}
        </div>
        <div id="meaning-display">{currentWord.meaning}</div>
      </div>

      <div className={cx(styles, 'input-container')}>
        <input
          ref={inputRef}
          type="text"
          id="word-input"
          className={inputClass || undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={input}
          onChange={(e) => onInput(e.target.value)}
        />
        <div className="typing-tip">Tapez le mot exactement comme il apparaît</div>
      </div>

      <div className={cx(styles, 'speed-lines')} ref={speedLinesRef} />
    </div>
  );
}
