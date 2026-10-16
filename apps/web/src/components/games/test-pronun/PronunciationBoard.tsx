import type { GameWord } from '@/hooks/use-games';
import { formatTime, playWordAudio } from './pronunciation';

export type FeedbackType = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export function PronunciationBoard({
  currentWord,
  completedWords,
  elapsed,
  accuracy,
  isListening,
  speechSupported,
  recognizedText,
  feedbackText,
  feedbackType,
  onStartListening,
  onStopListening,
  onSkip,
}: {
  currentWord: GameWord;
  completedWords: number;
  elapsed: number;
  accuracy: number;
  isListening: boolean;
  speechSupported: boolean;
  recognizedText: string;
  feedbackText: string;
  feedbackType: FeedbackType;
  onStartListening: () => void;
  onStopListening: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="active-game-screen active">
      <div className="game-info">
        <div className="words-display">
          <span className="words-label">Mots complétés</span>
          <span className="words-value">{completedWords}</span>
        </div>
        <div className="timer-display">
          <span className="timer-label">Temps</span>
          <span className="timer-value">{formatTime(elapsed)}</span>
        </div>
        <div className="accuracy-display">
          <span className="accuracy-label">Précision</span>
          <span className="accuracy-value">{accuracy}%</span>
        </div>
      </div>

      <div className="game-board">
        <div className={`word-display ${isListening ? 'speaking' : ''}`}>
          <h2 className="current-word">{currentWord.word}</h2>
          <p className="phonetic-text">{currentWord.pronunciation}</p>
        </div>

        <div className="pronunciation-controls">
          <button
            className="control-btn"
            onClick={() => playWordAudio(currentWord)}
          >
            <i className="fas fa-play"></i> Écouter
          </button>
          <button
            className={`control-btn ${isListening ? 'recording' : ''}`}
            onClick={() => (isListening ? onStopListening() : onStartListening())}
            disabled={!speechSupported}
          >
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            {isListening ? 'Arrêter' : 'Enregistrer'}
          </button>
          <button className="control-btn" onClick={onSkip}>
            <i className="fas fa-forward"></i> Passer
          </button>
        </div>

        <div className="feedback-container">
          <div className="accuracy-meter">
            <div className="meter-fill" style={{ width: `${accuracy}%` }} />
          </div>
          {recognizedText && (
            <div className="recognized-text">{recognizedText}</div>
          )}
          {feedbackText && (
            <p className={`feedback-text feedback-${feedbackType}`}>{feedbackText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
