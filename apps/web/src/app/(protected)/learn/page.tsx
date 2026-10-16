'use client';

import { Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useWords } from '@/hooks/use-words';
import { useRecordStreak } from '@/hooks/use-learning';
import { shuffleArray } from '@/lib/shuffle';
import { Flashcard, type LearnMode } from '@/components/learn/Flashcard';
import { LearnStats } from '@/components/learn/LearnStats';
import { LearnControls } from '@/components/learn/LearnControls';
import { LearnProgress } from '@/components/learn/LearnProgress';

/* ═══════════════════════════ */
/* LEARN PAGE CONTENT          */
/* ═══════════════════════════ */
function LearnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = Number(searchParams.get('package'));
  const { data: words, isLoading } = useWords(packageId || null);
  const recordStreak = useRecordStreak();

  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(
    new Set(['x', 'level_0', 'level_1', 'level_2']),
  );
  const [mode, setMode] = useState<LearnMode>('word-to-meaning');
  const [vocabMode, setVocabMode] = useState<'today-words' | 'all-words'>('today-words');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [review, setReview] = useState<Set<number>>(new Set());
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const streakRecordedRef = useRef(false);

  // Filter words
  const filteredWords = useMemo(() => {
    if (!words) return [];
    const list = words.filter((w) => selectedLevels.has(w.level));
    return shuffleArray(list);
    // shuffleKey is bumped by "Mélanger" to draw a new order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, selectedLevels, shuffleKey]);

  // Timer
  useEffect(() => {
    if (started && filteredWords.length > 0) {
      timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [started, filteredWords.length]);

  const resetSession = () => {
    setCurrentIndex(0);
    setKnown(new Set());
    setReview(new Set());
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
    resetSession();
  };

  /** Every card of the session is known: record today's activity for the streak. */
  const finishSession = useCallback(() => {
    const summary = `${filteredWords.length}/${filteredWords.length} mots maîtrisés`;
    const showSessionDone = () => toast.success(`Session terminée ! ${summary}`, { duration: 5000 });
    recordStreak.mutate(undefined, {
      onSuccess: (data) => {
        if (data.updated) {
          toast.success(`🔥 Série de ${data.streak} jour(s) !\n${summary}`, {
            duration: 6000,
            style: { whiteSpace: 'pre-line' },
          });
        } else {
          showSessionDone();
        }
      },
      onError: showSessionDone,
    });
  }, [filteredWords.length, recordStreak]);

  const handleKnow = useCallback(() => {
    const w = filteredWords[currentIndex];
    if (w) {
      const nextKnown = new Set(known).add(w.detail_id);
      setKnown(nextKnown);
      setReview((prev) => {
        const next = new Set(prev);
        next.delete(w.detail_id);
        return next;
      });
      if (!streakRecordedRef.current && filteredWords.every((fw) => nextKnown.has(fw.detail_id))) {
        streakRecordedRef.current = true;
        finishSession();
      }
    }
    if (currentIndex < filteredWords.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, filteredWords, known, finishSession]);

  const handleReview = useCallback(() => {
    const w = filteredWords[currentIndex];
    if (w) {
      setReview((prev) => new Set(prev).add(w.detail_id));
      setKnown((prev) => {
        const next = new Set(prev);
        next.delete(w.detail_id);
        return next;
      });
    }
    if (currentIndex < filteredWords.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, filteredWords]);

  const handleShuffle = () => {
    setShuffleKey((k) => k + 1);
    resetSession();
  };

  if (!packageId) {
    return (
      <div className="learn-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Aucun package sélectionné.</p>
        <button className="btn" onClick={() => router.push('/packages')}>
          Retour aux packages
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="learn-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return (
      <div className="learn-container">
        <h1 className="learn-title">Apprendre mon vocabulaire</h1>
        <div className="no-words">
          <i className="fas fa-book"></i>
          <h3>Aucun mot dans votre vocabulaire</h3>
          <p>Commencez à ajouter des mots pour pouvoir les apprendre.</p>
          <button className="btn" onClick={() => router.push(`/words?package=${packageId}`)}>
            Ajouter votre premier mot
          </button>
        </div>
      </div>
    );
  }

  const currentWord = filteredWords[currentIndex];
  const knownCount = filteredWords.filter((w) => known.has(w.detail_id)).length;
  const reviewCount = filteredWords.filter((w) => review.has(w.detail_id)).length;
  const progress = filteredWords.length > 0 ? ((knownCount / filteredWords.length) * 100).toFixed(0) : '0';

  return (
    <div className="learn-container">
      <h1 className="learn-title">Apprendre mon vocabulaire</h1>

      <LearnStats available={filteredWords.length} known={knownCount} sessionTime={sessionTime} />

      <LearnControls
        selectedLevels={selectedLevels}
        onToggleLevel={toggleLevel}
        mode={mode}
        onModeChange={setMode}
      />

      {/* Flashcard */}
      {filteredWords.length > 0 && currentWord ? (
        <div className="flashcard-container">
          <div className="card-count">
            <span>{currentIndex + 1}</span> / <span>{filteredWords.length}</span>
          </div>

          <div className="flashcard-with-navigation">
            <button
              className="nav-btn-left"
              disabled={currentIndex === 0}
              onClick={() => {
                setStarted(true);
                setCurrentIndex((i) => i - 1);
              }}
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            <Flashcard
              key={currentWord.detail_id}
              word={currentWord}
              mode={mode}
              onKnow={() => {
                setStarted(true);
                handleKnow();
              }}
              onReview={() => {
                setStarted(true);
                handleReview();
              }}
            />

            <button
              className="nav-btn-right"
              disabled={currentIndex >= filteredWords.length - 1}
              onClick={() => {
                setStarted(true);
                setCurrentIndex((i) => i + 1);
              }}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      ) : (
        <div className="no-words">
          <p>Aucun mot pour les niveaux sélectionnés.</p>
        </div>
      )}

      <LearnProgress progress={progress} reviewCount={reviewCount} knownCount={knownCount} />

      {/* Actions */}
      <div className="flashcard-actions">
        <button className="action-btn" onClick={handleShuffle}>
          <i className="fas fa-random"></i> Mélanger
        </button>
        <button
          className="action-btn game-btn"
          onClick={() => router.push(`/games/flash-match?package=${packageId}`)}
        >
          <i className="fas fa-gamepad"></i> Jouer pour apprendre
        </button>
      </div>

      <div className="home-cta">
        <button className="btn back-btn" onClick={() => router.push(`/words?package=${packageId}`)}>
          <i className="fas fa-arrow-left"></i> Retour à mon vocabulaire
        </button>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <LearnContent />
    </Suspense>
  );
}
