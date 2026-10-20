import type { GameWord } from '@/hooks/use-games';
import { formatTime } from './pronunciation';
import type { Feedback } from './use-feedback';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/test-pronun.module.css';

export function PronunciationBoard({
  currentWord,
  completedWords,
  elapsed,
  accuracy,
  meterWidth,
  speaking,
  wordFadeIn,
  isListening,
  speechSupported,
  recognizedText,
  feedback,
  onPlay,
  onToggleRecording,
  onSkip,
}: {
  currentWord: GameWord;
  completedWords: number;
  elapsed: number;
  accuracy: number;
  meterWidth: number;
  speaking: boolean;
  wordFadeIn: boolean;
  isListening: boolean;
  speechSupported: boolean;
  recognizedText: string;
  feedback: Feedback;
  onPlay: () => void;
  onToggleRecording: () => void;
  onSkip: () => void;
}) {
  return (
    <div className={cx(styles, 'active-game-screen', 'active')}>
      <div className={cx(styles, 'game-info')}>
        <div className={cx(styles, 'words-display')}>
          <span className={cx(styles, 'words-label')}>Mots complétés</span>
          <span className={cx(styles, 'words-value')}>{completedWords}</span>
        </div>
        <div className={cx(styles, 'timer-display')}>
          <span className={cx(styles, 'timer-label')}>Temps</span>
          <span id="timer" className={cx(styles, 'timer-value')}>
            {formatTime(elapsed)}
          </span>
        </div>
        <div className={cx(styles, 'accuracy-display')}>
          <span className={cx(styles, 'accuracy-label')}>Précision</span>
          <span className={cx(styles, 'accuracy-value')}>{Math.round(accuracy)}%</span>
        </div>
      </div>

      <div className="game-board">
        <div className={cx(styles, 'word-display', speaking && 'speaking')}>
          <h2 className={cx(styles, 'current-word', wordFadeIn && 'fadeIn')}>{currentWord.word}</h2>
          <p className={cx(styles, 'phonetic-text')}>{currentWord.pronunciation}</p>
        </div>

        <div className={cx(styles, 'pronunciation-controls')}>
          <button className={cx(styles, 'control-btn')} onClick={onPlay}>
            <i className="fas fa-play"></i> Écouter
          </button>
          {speechSupported ? (
            <button
              className={cx(styles, 'control-btn', isListening && 'recording')}
              onClick={onToggleRecording}
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>{' '}
              {isListening ? 'Arrêter' : 'Enregistrer'}
            </button>
          ) : (
            <button className={cx(styles, 'control-btn')} disabled>
              <i className="fas fa-exclamation-triangle"></i> Non supporté
            </button>
          )}
          <button className={cx(styles, 'control-btn')} onClick={onSkip}>
            <i className="fas fa-forward"></i> Passer le mot
          </button>
        </div>

        <div className={cx(styles, 'feedback-container')}>
          <div className={cx(styles, 'accuracy-meter')}>
            <div className={cx(styles, 'meter-fill')} style={{ width: `${meterWidth}%` }} />
          </div>
          <div className={cx(styles, 'recognized-text')}>{recognizedText}</div>
          <p className={cx(styles, 'feedback-text', feedback.type && `feedback-${feedback.type}`)}>
            {feedback.text}
          </p>
        </div>
      </div>
    </div>
  );
}
