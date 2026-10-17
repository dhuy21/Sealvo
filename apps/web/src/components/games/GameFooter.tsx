'use client';

import { useRouter } from 'next/navigation';
import { cx, type CssModule } from '@/lib/css-module';

/** `nextGame` is the route segment under `/games/`; omit it for the last game. */
export function GameFooter({
  packageId,
  nextGame,
  styles,
}: {
  packageId: number;
  nextGame?: string;
  styles: CssModule;
}) {
  const router = useRouter();
  return (
    <div className={cx(styles, 'game-footer')}>
      <button
        className={cx(styles, 'btn', 'learn-btn')}
        onClick={() => router.push(`/learn?package=${packageId}`)}
      >
        <i className="fas fa-arrow-left"></i> Apprendre
      </button>
      {nextGame && (
        <button
          className={cx(styles, 'btn', 'next-btn')}
          onClick={() => router.push(`/games/${nextGame}?package=${packageId}`)}
        >
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      )}
    </div>
  );
}
