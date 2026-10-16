import type { RefObject } from 'react';

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
    <div className="active-game-screen active">
      <div className="game-info">
        <div className="score-display">
          <span className="score-label">Score</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="timer-display">
          <span className="timer-label">Temps</span>
          <span className={`timer-value ${timer <= 30 ? 'warning' : ''}`}>{timer}</span>
        </div>
      </div>

      <div className="scrambled-word-container">
        <div className="scrambled-word">
          {resultType ? currentWord.word : currentWord.scrambled}
        </div>
        <div className="word-meaning">{currentWord.meaning}</div>
      </div>

      <div className="answer-container">
        <input
          ref={inputRef}
          type="text"
          className="word-input"
          placeholder="Votre réponse"
          autoComplete="off"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCheck();
          }}
        />
      </div>

      <div className="button-group">
        <button className="submit-btn" onClick={onCheck}>
          <div className="back"></div>
          <div className="front">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
        </button>
        <button
          className="pass-btn"
          onClick={onNext}
          disabled={!canSkip}
        >
          <div className="back"></div>
          <div className="front">
            <i className="fas fa-play"></i>
          </div>
        </button>
      </div>

      {resultMessage && (
        <div className={`result-message ${resultType}`}>{resultMessage}</div>
      )}
    </div>
  );
}
