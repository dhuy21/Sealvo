import { animateButtonPress } from './button-press';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function LearnActions({
  onShuffle,
  onReset,
  onPlay,
}: {
  onShuffle: () => void;
  onReset: () => void;
  onPlay: () => void;
}) {
  return (
    <div className={cx(styles, 'flashcard-actions')}>
      <button
        className={cx(styles, 'action-btn')}
        onMouseDown={animateButtonPress}
        onClick={onShuffle}
      >
        <i className="fas fa-random"></i> Mélanger
      </button>
      <button
        className={cx(styles, 'action-btn')}
        onMouseDown={animateButtonPress}
        onClick={onReset}
      >
        <i className="fas fa-redo"></i> Recommencer
      </button>
      <button className={cx(styles, 'action-btn', 'game-btn')} onClick={onPlay}>
        <i className="fas fa-gamepad"></i> Jouer pour apprendre
      </button>
    </div>
  );
}
