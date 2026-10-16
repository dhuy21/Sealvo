'use client';

import { useRouter } from 'next/navigation';
import { AnimatedCounter } from './AnimatedCounter';
import { animateButtonPress } from './button-press';
import { EmptyFlashcard } from './EmptyFlashcard';
import { Flashcard } from './Flashcard';
import { KnowledgeButtons } from './KnowledgeButtons';
import { LearnActions } from './LearnActions';
import { LearnControls } from './LearnControls';
import { LearnProgress } from './LearnProgress';
import { LearnStats } from './LearnStats';
import { RemainingWords } from './RemainingWords';
import { useFlashcardSession } from './use-flashcard-session';
import { useLearnShortcuts } from './use-learn-shortcuts';
import { useRecordSessionStreak } from './use-record-session-streak';
import { useSessionTimer } from './use-session-timer';
import { useStaggeredEntrance } from './use-staggered-entrance';
import type { ReviewWord } from './use-review-words';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function LearnSession({ words, packageId }: { words: ReviewWord[]; packageId: number }) {
  const router = useRouter();
  const sessionTime = useSessionTimer();
  const recordSessionStreak = useRecordSessionStreak();
  const session = useFlashcardSession(words, recordSessionStreak);
  const { deck, progress, card } = session;

  useStaggeredEntrance();
  useLearnShortcuts({
    hasCards: deck.length > 0,
    canGoPrev: session.canGoPrev,
    canGoNext: session.canGoNext,
    onPrev: session.goPrev,
    onNext: session.goNext,
    onFlip: session.toggleFlip,
    onMark: session.markCard,
  });

  const knownCount = progress.filter((p) => p === 2).length;
  const reviewCount = progress.filter((p) => p === 0).length;
  const remainingCount = progress.filter((p) => p !== 2).length;
  const percent = deck.length > 0 ? Math.round((knownCount / deck.length) * 100) : 0;

  return (
    <>
      <LearnStats available={words.length} known={knownCount} sessionTime={sessionTime} />

      <LearnControls
        selectedLevels={session.levels}
        onToggleLevel={session.toggleLevel}
        mode={session.mode}
        onModeChange={session.changeMode}
        vocabMode={session.vocabMode}
        onVocabModeChange={session.changeVocabMode}
      />

      <div className={cx(styles, 'flashcard-container', session.containerAnimation)}>
        <div className={cx(styles, 'card-count')}>
          <span>
            <AnimatedCounter value={card.word ? card.index + 1 : 0} initial={1} />
          </span>{' '}
          / <span>{card.total}</span>
        </div>

        <div className={cx(styles, 'flashcard-with-navigation')}>
          <button
            className={cx(styles, 'nav-btn-left')}
            disabled={session.prevDisabled}
            onMouseDown={animateButtonPress}
            onClick={session.goPrev}
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          {card.word ? (
            <Flashcard
              key={card.version}
              word={card.word}
              mode={card.mode}
              hintMode={session.mode}
              flipped={session.flipped}
              updating={session.updating}
              animation={session.cardAnimation}
              onToggle={session.toggleFlip}
            />
          ) : (
            <EmptyFlashcard />
          )}

          <button
            className={cx(styles, 'nav-btn-right')}
            disabled={session.nextDisabled}
            onMouseDown={animateButtonPress}
            onClick={session.goNext}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <KnowledgeButtons onMark={session.markCard} />
      </div>

      <LearnProgress
        progress={percent}
        reviewCount={reviewCount}
        remainingCount={remainingCount}
        knownCount={knownCount}
        animation={session.progressAnimation}
      >
        <RemainingWords deck={deck} progress={progress} onJump={session.jumpTo} />
      </LearnProgress>

      <LearnActions
        onShuffle={session.shuffle}
        onReset={session.reset}
        onPlay={() => router.push(`/games/flash-match?package=${packageId}`)}
      />
    </>
  );
}
