'use client';

import { useState, type CSSProperties } from 'react';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

function hintFor(target: string): string {
  return target.length > 2
    ? `Commence par "${target.charAt(0)}${target.charAt(1)}..." et contient ${target.length} caractères`
    : 'Indice non disponible pour ce mot';
}

/** "Indice" button on the card front; in meaning → word mode the hint fades out after 5 s. */
export function FlashcardHint({ target, autoHide }: { target: string; autoHide: boolean }) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);
  const [pulse, setPulse] = useState(false);

  const showHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPulse(true);
    setTimeout(() => setPulse(false), 500);

    setText(hintFor(target));
    setStyle({ opacity: 1, transform: 'translateY(0)', display: 'block' });

    if (autoHide) {
      setTimeout(() => {
        setStyle((s) => ({ ...s, opacity: 0 }));
        setTimeout(() => setStyle((s) => ({ ...s, display: 'none' })), 500);
      }, 5000);
    }
  };

  return (
    <div className={cx(styles, 'hint-container')}>
      <button className={cx(styles, 'hint-btn', pulse && 'pulse')} onClick={showHint}>
        <i className="fas fa-lightbulb"></i> Indice
      </button>
      <p className={cx(styles, 'hint-text')} style={style}>
        {text}
      </p>
    </div>
  );
}
