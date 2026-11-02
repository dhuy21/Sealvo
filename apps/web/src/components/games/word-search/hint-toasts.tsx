import toast from 'react-hot-toast';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-search.module.css';

function HintContent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cx(styles, 'hint-content')}>
      <div className={cx(styles, 'hint-title')}>{title}</div>
      <div className={cx(styles, 'hint-message')}>{children}</div>
    </div>
  );
}

const baseStyle = {
  color: 'white',
  padding: '1rem 1.5rem',
  maxWidth: '90%',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

export function showLowScoreToast(): void {
  toast(
    <HintContent title="Note">
      Votre score est inférieur à 100 points pour avoir un indice
    </HintContent>,
    {
      icon: '🚨',
      duration: 3000,
      style: {
        ...baseStyle,
        background: 'rgba(219, 86, 8, 0.95)',
        borderRadius: '15px',
        boxShadow: '0 10px 25px rgba(203, 57, 17, 0.3)',
      },
    },
  );
}

export function showHintToast(word: string): void {
  toast(
    <HintContent title="Indice">
      Regardez le mot <span>&quot;{word}&quot;</span>
    </HintContent>,
    {
      icon: '💡',
      duration: 3000,
      style: {
        ...baseStyle,
        background: 'rgba(106, 17, 203, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(106, 17, 203, 0.3)',
      },
    },
  );
}
