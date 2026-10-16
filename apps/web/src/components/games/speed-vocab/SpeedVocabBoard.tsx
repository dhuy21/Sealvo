import type { RefObject } from 'react';

export function SpeedVocabBoard({
  currentWord,
  score,
  streak,
  timer,
  input,
  inputRef,
  inputFeedback,
  onInput,
}: {
  currentWord: { word: string; meaning: string };
  score: number;
  streak: number;
  timer: number;
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  inputFeedback: 'correct' | 'incorrect' | '';
  onInput: (value: string) => void;
}) {
  return (
    <div className="active-game-screen active game-active">
      <div className="game-info">
        <div className="score-display">
          <span className="score-label">Score</span>
          <span id="score" className="score-value">{score}</span>
        </div>
        <div className="streak-display">
          <span className="streak-label">Série</span>
          <span id="streak" className="streak-value">{streak}</span>
        </div>
        <div className="timer-display">
          <span className="timer-label">Temps</span>
          <span id="timer" className={`timer-value ${timer <= 50 ? 'warning' : ''}`}>{timer}</span>
        </div>
      </div>

      <div className="word-container">
        <div id="word-display" className="word-display">{currentWord.word}</div>
        <div id="meaning-display" className="meaning-display">{currentWord.meaning}</div>
      </div>

      <div className="input-container">
        <input
          ref={inputRef}
          id="word-input"
          type="text"
          className={`word-input ${inputFeedback}`}
          placeholder="Tapez le mot ici..."
          autoComplete="off"
          value={input}
          onChange={(e) => onInput(e.target.value)}
        />
      </div>
    </div>
  );
}
