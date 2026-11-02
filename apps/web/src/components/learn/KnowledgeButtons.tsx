import { animateButtonPress } from './button-press';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function KnowledgeButtons({ onMark }: { onMark: (level: 0 | 2) => void }) {
  return (
    <div className={cx(styles, 'knowledge-buttons')}>
      <button
        className={cx(styles, 'knowledge-btn')}
        data-level="0"
        onMouseDown={animateButtonPress}
        onClick={() => onMark(0)}
      >
        <i className="fas fa-redo"></i> À revoir
      </button>
      <button
        className={cx(styles, 'knowledge-btn')}
        data-level="2"
        onMouseDown={animateButtonPress}
        onClick={() => onMark(2)}
      >
        <i className="fas fa-check"></i> Appris
      </button>
    </div>
  );
}
