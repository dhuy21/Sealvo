import { useRef, useState } from 'react';
import type { GameType } from '@sealvo/shared';
import { useGameData, useSaveScore } from '@/hooks/use-games';
import { usePackageIdParam } from '@/hooks/use-package-id-param';
import { useTimeouts } from '@/hooks/use-timeouts';
import type { CancelConfetti } from './confetti';
import type { LevelStatus } from './TrackLevelMessage';
import { useCelebration } from './use-celebration';
import { useLevelTracking } from './use-level-tracking';

export type GameScreen = 'pre' | 'active' | 'post';

const SUCCESS_MESSAGE = 'Excellent travail ! Progressez les autres jeux de ce niveau 😍';
const FAILURE_MESSAGE = 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧';

const noCelebration = (): CancelConfetti => () => {};

interface GameShellOptions {
  /** Confetti launched with the summary; none when omitted. */
  celebration?: () => CancelConfetti;
  /** Report level progress when the summary appears rather than when the game ends. */
  trackOnSummary?: boolean;
}

/**
 * Package, game data and rules → game → summary flow shared by every game page.
 * `finish` saves the score, shows the level message and reveals the summary 1s later.
 */
export function useGameShell(
  gameType: GameType,
  { celebration = noCelebration, trackOnSummary = false }: GameShellOptions = {},
) {
  const packageId = usePackageIdParam();

  const { data: gameData, isLoading, error } = useGameData(gameType, packageId);
  const saveScore = useSaveScore();
  const level = useLevelTracking(gameType);
  const later = useTimeouts();
  const celebrate = useCelebration(celebration);

  const [screen, setScreen] = useState<GameScreen>('pre');
  /** From `start` to `finish`; the screen stays `active` for 1s after. */
  const [playing, setPlaying] = useState(false);
  const [levelMessage, setLevelMessage] = useState('');
  const [levelStatus, setLevelStatus] = useState<LevelStatus>('');
  const finishedRef = useRef(false);

  const start = () => {
    finishedRef.current = false;
    setPlaying(true);
    setLevelMessage('');
    setLevelStatus('');
    setScreen('active');
  };

  /** Returns `false`, doing nothing, when this game already finished (e.g. last word found as the time runs out). */
  const finish = (score: number, success: boolean): boolean => {
    if (finishedRef.current) return false;
    finishedRef.current = true;

    setPlaying(false);
    setLevelMessage(success ? SUCCESS_MESSAGE : FAILURE_MESSAGE);
    setLevelStatus(success ? 'completed' : 'failed');
    saveScore.mutate({ game_type: gameType, score });
    if (!trackOnSummary) level.track(success, packageId!);

    later(() => {
      setScreen('post');
      if (trackOnSummary) level.track(success, packageId!);
      celebrate();
    }, 1000);
    return true;
  };

  return {
    packageId,
    gameData,
    isLoading,
    error,
    ready: !!gameData && !gameData.errorMessage,
    screen,
    playing,
    showRules: () => setScreen('pre'),
    start,
    finish,
    levelMessage,
    levelStatus,
    levelFinished: level.levelFinished,
  };
}
