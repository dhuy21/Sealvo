import { useEffect, useRef, useState } from 'react';
import { shuffleArray } from '@/lib/shuffle';
import {
  buildDeck,
  freshProgress,
  INITIAL_LEVELS,
  type CardProgress,
  type VocabMode,
} from './deck';
import { loadProgress, saveProgress } from './progress-storage';
import { useLeaveConfirmation } from '@/hooks/use-leave-confirmation';
import { useTimeouts } from '@/hooks/use-timeouts';
import type { LearnMode } from './Flashcard';
import type { ReviewWord } from '@/hooks/use-words';

const UNSAVED_PROGRESS_MESSAGE =
  'Vous avez des progrès non sauvegardés. Êtes-vous sûr de vouloir quitter ?';

/** What the card currently shows; it lags behind the session state while the card is redrawn. */
interface DisplayedCard {
  word: ReviewWord | undefined;
  index: number;
  total: number;
  mode: LearnMode;
  /** Bumped on every redraw: resets the flip and the hint. */
  version: number;
}

/**
 * Flashcard session: filtered deck, per-card progress (persisted in localStorage),
 * navigation and the card/container animations that accompany each action.
 * Delayed callbacks read the latest deck/index/mode through refs, like the old page's globals.
 */
export function useFlashcardSession(
  words: ReviewWord[],
  onComplete: (known: number, total: number) => void,
) {
  const [initial] = useState(() => {
    const deck = buildDeck(words, INITIAL_LEVELS, 'today-words');
    return loadProgress(deck) ?? { deck, progress: freshProgress(deck.length) };
  });
  const [levels, setLevels] = useState<ReadonlySet<string>>(INITIAL_LEVELS);
  const [vocabMode, setVocabMode] = useState<VocabMode>('today-words');
  const [mode, setModeState] = useState<LearnMode>('word-to-meaning');
  const [deck, setDeckState] = useState(initial.deck);
  const [progress, setProgressState] = useState<CardProgress[]>(initial.progress);
  const [currentIndex, setIndexState] = useState(0);
  const [card, setCard] = useState<DisplayedCard>(() => ({
    word: initial.deck[0],
    index: 0,
    total: initial.deck.length,
    mode: 'word-to-meaning',
    version: 0,
  }));
  const [updating, setUpdating] = useState(false);
  const [flippedVersion, setFlippedVersion] = useState<number | null>(null);
  const [cardAnimation, setCardAnimation] = useState('');
  const [containerAnimation, setContainerAnimation] = useState('');
  const [progressAnimation, setProgressAnimation] = useState('');
  const deckRef = useRef(initial.deck);
  const progressRef = useRef<CardProgress[]>(initial.progress);
  const indexRef = useRef(0);
  const modeRef = useRef<LearnMode>('word-to-meaning');
  const streakRecordedRef = useRef(false);
  const schedule = useTimeouts();

  useEffect(() => {
    saveProgress(deck, progress);
  }, [deck, progress]);

  useLeaveConfirmation(
    progress.some((p) => p !== -1),
    UNSAVED_PROGRESS_MESSAGE,
  );

  const setDeck = (next: ReviewWord[]) => {
    deckRef.current = next;
    setDeckState(next);
  };
  const setProgress = (next: CardProgress[]) => {
    progressRef.current = next;
    setProgressState(next);
  };
  const setIndex = (next: number) => {
    indexRef.current = next;
    setIndexState(next);
  };

  /** Fades the card out, swaps its content 150 ms later and fades it back in. */
  const redrawCard = () => {
    const d = deckRef.current;
    const index = indexRef.current;
    const m = modeRef.current;

    if (d.length === 0) {
      setCard((c) => ({ word: undefined, index: 0, total: 0, mode: m, version: c.version + 1 }));
      return;
    }

    setUpdating(true);
    schedule(() => {
      setCard((c) => ({ word: d[index], index, total: d.length, mode: m, version: c.version + 1 }));
      schedule(() => setUpdating(false), 50);
    }, 150);
  };

  const startDeck = (next: ReviewWord[]) => {
    setDeck(next);
    setIndex(0);
    setProgress(freshProgress(next.length));
    redrawCard();
  };

  const toggleLevel = (level: string) => {
    const next = new Set([...levels].filter((l) => l !== 'v'));
    if (next.has(level)) next.delete(level);
    else next.add(level);
    if (next.size === 0) next.add('x');
    setLevels(next);
    startDeck(buildDeck(words, next, vocabMode));
  };

  const changeVocabMode = (next: VocabMode) => {
    setVocabMode(next);
    startDeck(buildDeck(words, levels, next));
  };

  const changeMode = (next: LearnMode) => {
    modeRef.current = next;
    setModeState(next);
    setContainerAnimation('mode-change');
    schedule(() => {
      setContainerAnimation('');
      redrawCard();
    }, 400);
  };

  const goPrev = () => {
    if (indexRef.current <= 0) return;
    setCardAnimation('slide-right');
    schedule(() => {
      setIndex(Math.max(0, indexRef.current - 1));
      redrawCard();
      setCardAnimation('');
    }, 200);
  };

  const advance = () => {
    setIndex(Math.min(deckRef.current.length - 1, indexRef.current + 1));
    redrawCard();
    setCardAnimation('');
  };

  const goNext = () => {
    if (indexRef.current >= deckRef.current.length - 1) return;
    setCardAnimation('slide-left');
    schedule(advance, 200);
  };

  const markCard = (level: 0 | 2) => {
    if (deckRef.current.length === 0) return;
    const next = [...progressRef.current];
    next[indexRef.current] = level;
    setProgress(next);

    if (!streakRecordedRef.current && next.every((p) => p === 2)) {
      streakRecordedRef.current = true;
      onComplete(next.filter((p) => p === 2).length, deckRef.current.length);
    }

    setCardAnimation(level === 0 ? 'wrong-answer' : 'correct-answer');
    schedule(() => {
      setCardAnimation('');
      if (indexRef.current < deckRef.current.length - 1) {
        setCardAnimation('slide-left');
        schedule(advance, 200);
      }
    }, 500);
  };

  const toggleFlip = () => {
    if (deckRef.current.length === 0) return;
    setFlippedVersion((f) => (f === card.version ? null : card.version));
  };

  const shuffle = () => {
    setDeck(shuffleArray(deckRef.current));
    setIndex(0);
    setProgress(freshProgress(deckRef.current.length));
    setContainerAnimation('shuffle-animation');
    schedule(() => {
      setContainerAnimation('');
      redrawCard();
    }, 600);
  };

  const reset = () => {
    setProgressAnimation('reset-animation');
    schedule(() => {
      setProgressAnimation('');
      setIndex(0);
      setProgress(freshProgress(deckRef.current.length));
      redrawCard();
    }, 500);
  };

  const jumpTo = (index: number) => {
    setIndex(index);
    redrawCard();
  };

  const prevDisabled = !card.word || card.index === 0;
  const nextDisabled = !card.word || card.index === card.total - 1;

  return {
    levels,
    toggleLevel,
    vocabMode,
    changeVocabMode,
    mode,
    changeMode,
    deck,
    progress,
    card,
    updating,
    flipped: flippedVersion === card.version,
    toggleFlip,
    prevDisabled,
    nextDisabled,
    canGoPrev: currentIndex > 0 && !prevDisabled,
    canGoNext: currentIndex < deck.length - 1 && !nextDisabled,
    goPrev,
    goNext,
    markCard,
    jumpTo,
    shuffle,
    reset,
    cardAnimation,
    containerAnimation,
    progressAnimation,
  };
}
