'use client';

import { Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWords } from '@/hooks/use-words';
import type { Word } from '@/hooks/use-words';

const LEVELS = ['x', 'level_0', 'level_1', 'level_2', 'v'] as const;

function levelLabel(level: string): string {
  if (level === 'x') return 'x';
  if (level === 'v') return 'v';
  return level.replace('level_', '');
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ─── Flashcard ─── */
function Flashcard({
  word,
  mode,
  onKnow,
  onReview,
}: {
  word: Word;
  mode: 'word-to-meaning' | 'meaning-to-word';
  onKnow: () => void;
  onReview: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [word]);

  const front = mode === 'word-to-meaning' ? word.word : word.meaning;
  const back = mode === 'word-to-meaning' ? word.meaning : word.word;

  return (
    <>
      <div className={`flashcard${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <span className="card-type">{word.type}</span>
            <h2 className="card-content">{front}</h2>
            <p className="card-prompt">Cliquez pour voir la traduction</p>
          </div>
          <div className="flashcard-back">
            <span className="card-type">{word.type}</span>
            <h2 className="card-content">{back}</h2>
            <div className="card-details">
              {word.example && (
                <div className="example-text">
                  <strong>Exemple:</strong> {word.example}
                </div>
              )}
              {word.pronunciation && (
                <div className="pronunciation-text">
                  <strong>Prononciation:</strong> {word.pronunciation}
                </div>
              )}
              {word.synonyms && (
                <p>
                  <strong>Synonymes:</strong> {word.synonyms}
                </p>
              )}
              {word.antonyms && (
                <p>
                  <strong>Antonymes:</strong> {word.antonyms}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="knowledge-buttons">
        <button className="knowledge-btn" onClick={onReview}>
          <i className="fas fa-redo"></i> À revoir
        </button>
        <button className="knowledge-btn" onClick={onKnow}>
          <i className="fas fa-check"></i> Appris
        </button>
      </div>
    </>
  );
}

/* ═══════════════════════════ */
/* LEARN PAGE CONTENT          */
/* ═══════════════════════════ */
function LearnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = Number(searchParams.get('package'));
  const { data: words, isLoading } = useWords(packageId || null);

  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(
    new Set(['x', 'level_0', 'level_1', 'level_2']),
  );
  const [mode, setMode] = useState<'word-to-meaning' | 'meaning-to-word'>('word-to-meaning');
  const [vocabMode, setVocabMode] = useState<'today-words' | 'all-words'>('today-words');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [review, setReview] = useState<Set<number>>(new Set());
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [started, setStarted] = useState(false);

  // Filter words
  const filteredWords = useMemo(() => {
    if (!words) return [];
    let list = words.filter((w) => selectedLevels.has(w.level));
    return shuffleArray(list);
  }, [words, selectedLevels]);

  // Timer
  useEffect(() => {
    if (started && filteredWords.length > 0) {
      timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [started, filteredWords.length]);

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const handleKnow = useCallback(() => {
    const w = filteredWords[currentIndex];
    if (w) setKnown((prev) => new Set(prev).add(w.detail_id));
    if (currentIndex < filteredWords.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, filteredWords]);

  const handleReview = useCallback(() => {
    const w = filteredWords[currentIndex];
    if (w) setReview((prev) => new Set(prev).add(w.detail_id));
    if (currentIndex < filteredWords.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, filteredWords]);

  const handleShuffle = () => {
    setCurrentIndex(0);
    setKnown(new Set());
    setReview(new Set());
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
  const progress = filteredWords.length > 0 ? ((known.size / filteredWords.length) * 100).toFixed(0) : '0';

  return (
    <div className="learn-container">
      <h1 className="learn-title">Apprendre mon vocabulaire</h1>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-book"></i>
          </div>
          <div className="stat-content">
            <h3>{filteredWords.length}</h3>
            <p>Mots disponibles</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{known.size}</h3>
            <p>Mots maîtrisés</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-stopwatch"></i>
          </div>
          <div className="stat-content">
            <h3>{formatTime(sessionTime)}</h3>
            <p>Temps de session</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flashcard-controls">
        <div className="flashcard-filters">
          <h3>Niveaux</h3>
          <div className="filter-options">
            <div className="filter-row">
              {LEVELS.filter((l) => l !== 'v').map((level) => (
                <label key={level} className="filter-label">
                  <input
                    type="checkbox"
                    checked={selectedLevels.has(level)}
                    onChange={() => toggleLevel(level)}
                  />
                  <span className="custom-checkbox"></span>
                  Niveau {levelLabel(level)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mode-selector">
          <h3>Mode d&apos;apprentissage</h3>
          <div className="mode-options">
            <label className="mode-label">
              <input
                type="radio"
                name="mode"
                checked={mode === 'word-to-meaning'}
                onChange={() => setMode('word-to-meaning')}
              />
              <span className="custom-radio"></span>
              Mot → Signification
            </label>
            <label className="mode-label">
              <input
                type="radio"
                name="mode"
                checked={mode === 'meaning-to-word'}
                onChange={() => setMode('meaning-to-word')}
              />
              <span className="custom-radio"></span>
              Signification → Mot
            </label>
          </div>
        </div>
      </div>

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

      {/* Progress */}
      <div className="progress-container">
        <div className="progress-header">
          <h3>Votre progression</h3>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-stats">
          <div className="progress-stat">
            <span className="stat-icon red">
              <i className="fas fa-redo"></i>
            </span>
            <span>{review.size}</span>
          </div>
          <div className="progress-stat">
            <span className="stat-icon green">
              <i className="fas fa-check"></i>
            </span>
            <span>{known.size}</span>
          </div>
        </div>
      </div>

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
