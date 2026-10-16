'use client';

import { useRouter } from 'next/navigation';

/** `nextGame` is the route segment under `/games/`; omit it for the last game. */
export function GameFooter({ packageId, nextGame }: { packageId: number; nextGame?: string }) {
  const router = useRouter();
  return (
    <div className="game-footer">
      <button className="btn learn-btn" onClick={() => router.push(`/learn?package=${packageId}`)}>
        <i className="fas fa-arrow-left"></i> Apprendre
      </button>
      {nextGame && (
        <button className="btn next-btn" onClick={() => router.push(`/games/${nextGame}?package=${packageId}`)}>
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      )}
    </div>
  );
}
