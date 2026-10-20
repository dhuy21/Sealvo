'use client';

import { useUserScores } from '@/hooks/use-games';
import { cx, type CssModule } from '@/lib/css-module';

export function GameStats({
  gameType,
  wordCount,
  styles,
}: {
  gameType: string;
  wordCount: number;
  styles: CssModule;
}) {
  const { data: scores } = useUserScores();
  const highScore = scores?.find((s) => s.game_type === gameType);

  return (
    <div className={cx(styles, 'game-stats')}>
      <div className={cx(styles, 'stat-box')}>
        <span className={cx(styles, 'stat-label')}>Votre meilleur score</span>
        <span className={cx(styles, 'stat-value')}>{highScore ? highScore.best_score : 0}</span>
      </div>
      <div className={cx(styles, 'stat-box')}>
        <span className={cx(styles, 'stat-label')}>Mots disponibles</span>
        <span className={cx(styles, 'stat-value')}>{wordCount}</span>
      </div>
    </div>
  );
}
