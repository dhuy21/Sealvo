import type { RefObject } from 'react';

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
    <div className="screen active-game-screen active">
      <div className="game-info">
        <div className="score-display">
          <div className="score-label">Score</div>
          <span className="score-value">{score}</span>
        </div>
        <div className="progress-display">
          <div className="progress-label">Question</div>
          <span className="progress-value">
            {currentIndex + (answered ? 1 : 0)}/{totalQuestions}
          </span>
        </div>
        <div className="timer-display">
          <div className="timer-label">Temps</div>
          <span className={`timer-value ${timer <= 20 ? 'warning' : ''}`}>{timer}</span>
        </div>
      </div>

      <div className="phrase-container">
        <p
          className="phrase-text"
          dangerouslySetInnerHTML={{ __html: displayPhrase }}
        />

        <div className="input-container">
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
            onKeyDown={(e) => { if (e.key === 'Enter') onCheck(); }}
            disabled={answered}
          />
        </div>

        <div className="button-group">
          <button className="submit-btn" onClick={onCheck} disabled={answered}>
            <div className="back"></div>
            <div className="front"><i className="fas fa-crown"></i></div>
          </button>
          <button
            className="pass-btn"
            onClick={onNext}
            disabled={!answered}
          >
            <div className="back"></div>
            <div className="front">
              {currentIndex + 1 >= totalQuestions
                ? <i className="fa-solid fa-medal"></i>
                : <i className="fas fa-play"></i>
              }
            </div>
          </button>
        </div>

        {meaningText && <p className="word-meaning">{meaningText}</p>}
      </div>

      {feedbackMessage && (
        <div className="feedback-container">
          <div className={`feedback-message ${feedbackType}`}>{feedbackMessage}</div>
        </div>
      )}
    </div>
  );
}
