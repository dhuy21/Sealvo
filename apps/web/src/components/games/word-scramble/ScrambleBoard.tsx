import type { RefObject } from 'react';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-scramble.module.css';

export interface ScrambledWord {
  word: string;
  scrambled: string;
  meaning: string;
}

export function ScrambleBoard({
  currentWord,
  score,
  timer,
  input,
  inputRef,
  resultMessage,
  resultType,
  canSkip,
  onInputChange,
  onCheck,
  onNext,
}: {
  currentWord: ScrambledWord;
  score: number;
  timer: number;
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  resultMessage: string;
  resultType: 'correct' | 'incorrect' | '';
  canSkip: boolean;
  onInputChange: (value: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  return (
    <div className={cx(styles, 'active-game-screen', 'active')}>
      <div className={cx(styles, 'game-info')}>
        <div className={cx(styles, 'score-display')}>
          <span className={cx(styles, 'score-label')}>Score</span>
          <span className={cx(styles, 'score-value')}>{score}</span>
        </div>
        <div className={cx(styles, 'timer-display')}>
          <span className={cx(styles, 'timer-label')}>Temps</span>
          <span className={cx(styles, 'timer-value', timer <= 30 && 'warning')}>{timer}</span>
        </div>
      </div>

      <div className={cx(styles, 'scrambled-word-container')}>
        <div className={cx(styles, 'scrambled-word')}>
          {resultType ? currentWord.word : currentWord.scrambled}
        </div>
        <div className={cx(styles, 'word-meaning')}>{currentWord.meaning}</div>
      </div>

      <div className={cx(styles, 'answer-container')}>
        <input
          ref={inputRef}
          type="text"
          id="word-input"
          className={cx(styles, 'word-input')}
          autoComplete="off"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCheck();
          }}
        />
      </div>

      <div className={cx(styles, 'button-group')}>
        <button className={cx(styles, 'submit-btn')} onClick={onCheck}>
          <div className={cx(styles, 'back')}></div>
          <div className={cx(styles, 'front')}>
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
        </button>
        <button
          className={cx(styles, 'pass-btn')}
          onClick={onNext}
          disabled={!canSkip}
        >
          <div className={cx(styles, 'back')}></div>
          <div className={cx(styles, 'front')}>
            <i className="fas fa-play"></i>
          </div>
        </button>
      </div>

      <div className={cx(styles, 'result-message', resultType)}>{resultMessage}</div>
    </div>
  );
}
