'use client';

import { useRouter } from 'next/navigation';
import { cx, type CssModule } from '@/lib/css-module';

/** Replay button, replaced by "Terminé" (back to the games list) once the level is completed. */
export function PlayAgainActions({
  levelFinished,
  packageId,
  onReplay,
  replayLabel = 'Rejouer',
  styles,
}: {
  levelFinished: boolean;
  packageId: number;
  onReplay: () => void;
  replayLabel?: string;
  styles: CssModule;
}) {
  const router = useRouter();

  return (
    <div id="play-again-container" className={cx(styles, 'action-buttons')}>
      {levelFinished ? (
        <button
          id="finish-level"
          className={cx(styles, 'play-again-btn')}
          onClick={() => router.push(`/games?package=${packageId}`)}
        >
          <i className="fa-solid fa-heart" style={{ color: '#FFD43B' }}></i> Terminé
        </button>
      ) : (
        <button id="play-again" className={cx(styles, 'play-again-btn')} onClick={onReplay}>
          <i className="fas fa-redo"></i> {replayLabel}
        </button>
      )}
    </div>
  );
}
