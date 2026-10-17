import type { RefObject } from 'react';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/phrase-completion.module.css';

export function PhraseBoard({
  score,
  currentIndex,
  totalQuestions,
  timer,
  answered,
  displayPhrase,
  input,
  inputRef,
  meaningText,
  feedbackMessage,
  feedbackType,
  onInputChange,
  onCheck,
  onNext,
}: {
  score: number;
  currentIndex: number;
  totalQuestions: number;
  timer: number;
  answered: boolean;
  /** Pre-escaped HTML: only `<span class="blank …">` markup is injected around escaped words. */
  displayPhrase: string;
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  meaningText: string;
  feedbackMessage: string;
  feedbackType: 'correct' | 'incorrect' | '';
  onInputChange: (value: string) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  return (
    <div className={cx(styles, 'screen', 'active-game-screen', 'active')}>
      <div className={cx(styles, 'game-info')}>
        <div className={cx(styles, 'score-display')}>
          <div className={cx(styles, 'score-label')}>Score</div>
          <span className={cx(styles, 'score-value')}>{score}</span>
        </div>
        <div className={cx(styles, 'progress-display')}>
          <div className={cx(styles, 'progress-label')}>Question</div>
          <span className={cx(styles, 'progress-value')}>
            {currentIndex + (answered ? 1 : 0)}/{totalQuestions}
          </span>
        </div>
        <div className={cx(styles, 'timer-display')}>
          <div className={cx(styles, 'timer-label')}>Temps</div>
          <span id="timer" className={cx(styles, 'timer-value', timer <= 20 && 'warning')}>
            {timer}
          </span>
        </div>
      </div>

      <div className={cx(styles, 'phrase-container')}>
        <p
          className={cx(styles, 'phrase-text')}
          dangerouslySetInnerHTML={{ __html: displayPhrase }}
        />

        <div className={cx(styles, 'input-container')}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Tapez le mot manquant ici"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCheck();
            }}
            disabled={answered}
          />
        </div>

        <div className={cx(styles, 'button-group')}>
          <button className={cx(styles, 'submit-btn')} onClick={onCheck} disabled={answered}>
            <div className={cx(styles, 'back')}></div>
            <div className={cx(styles, 'front')}>
              <i className="fas fa-crown"></i>
            </div>
          </button>
          <button className={cx(styles, 'pass-btn')} onClick={onNext} disabled={!answered}>
            <div className={cx(styles, 'back')}></div>
            <div className={cx(styles, 'front')}>
              {currentIndex + 1 >= totalQuestions ? (
                <i className="fa-solid fa-medal"></i>
              ) : (
                <i className="fas fa-play"></i>
              )}
            </div>
          </button>
        </div>

        {meaningText && <p className={cx(styles, 'word-meaning')}>{meaningText}</p>}
      </div>

      {feedbackMessage && (
        <div className={cx(styles, 'feedback-container')}>
          <div className={cx(styles, 'feedback-message', feedbackType)}>{feedbackMessage}</div>
        </div>
      )}
    </div>
  );
}
