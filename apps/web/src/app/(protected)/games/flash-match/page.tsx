'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameData, useSaveScore, useTrackLevelProgress } from '@/hooks/use-games';
import type { GameWord } from '@/hooks/use-games';
import toast from 'react-hot-toast';

interface Card {
  pairId: number;
  type: 'word' | 'meaning';
  content: string;
  flipped: boolean;
  matched: boolean;
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

function generateCards(words: GameWord[]): Card[] {
  const selected = words.slice(0, 15); // max 15 pairs
  const cards: Card[] = [];
  selected.forEach((w) => {
    cards.push({ pairId: w.detail_id, type: 'word', content: w.word, flipped: false, matched: false });
    cards.push({ pairId: w.detail_id, type: 'meaning', content: w.meaning, flipped: false, matched: false });
  });
  return shuffleArray(cards);
}

type Screen = 'pre' | 'active' | 'post';

/* ═══════════════════════════ */
/* FLASH MATCH GAME            */
/* ═══════════════════════════ */
function FlashMatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageId = Number(searchParams.get('package'));

  const { data: gameData, isLoading } = useGameData('flash_match', packageId || null);
  const saveScore = useSaveScore();
  const trackProgress = useTrackLevelProgress();

  const [screen, setScreen] = useState<Screen>('pre');
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [levelMessage, setLevelMessage] = useState<{ text: string; success: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const checkingRef = useRef(false);

  // Timer
  useEffect(() => {
    if (gameActive) {
      timerRef.current = setInterval(() => setCurrentTime((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameActive]);

  const startGame = useCallback(() => {
    if (!gameData?.words?.length) return;
    const newCards = generateCards(gameData.words);
    setCards(newCards);
    setTotalPairs(newCards.length / 2);
    setSelected([]);
    setMoves(0);
    setMatchedPairs(0);
    setCurrentTime(0);
    setGameActive(true);
    setScreen('active');
    setLevelMessage(null);
  }, [gameData]);

  const flipCard = useCallback(
    (index: number) => {
      if (!gameActive || checkingRef.current) return;
      if (cards[index].flipped || cards[index].matched) return;
      if (selected.length >= 2) return;

      const newCards = [...cards];
      newCards[index] = { ...newCards[index], flipped: true };
      setCards(newCards);

      const newSelected = [...selected, index];
      setSelected(newSelected);

      if (newSelected.length === 2) {
        setMoves((m) => m + 1);
        checkingRef.current = true;

        setTimeout(() => {
          const c1 = newCards[newSelected[0]];
          const c2 = newCards[newSelected[1]];

          if (c1.pairId === c2.pairId && c1.type !== c2.type) {
            // Match
            const updated = [...newCards];
            updated[newSelected[0]] = { ...updated[newSelected[0]], matched: true };
            updated[newSelected[1]] = { ...updated[newSelected[1]], matched: true };
            setCards(updated);
            const newMatched = matchedPairs + 1;
            setMatchedPairs(newMatched);

            if (newMatched === totalPairs) {
              // Game over
              setGameActive(false);
              clearInterval(timerRef.current);

              const isSuccessful = newMatched >= Math.ceil(totalPairs * 0.8);
              setLevelMessage({
                text: isSuccessful
                  ? 'Excellent travail ! Progressez les autres jeux de ce niveau 😍'
                  : 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧',
                success: isSuccessful,
              });

              saveScore.mutate({ game_type: 'flash_match', score: newMatched });
              trackProgress.mutate({
                game_type: 'flash_match',
                completed: isSuccessful,
                packageId,
              });

              setTimeout(() => setScreen('post'), 1000);
            }
          } else {
            // No match
            const updated = [...newCards];
            updated[newSelected[0]] = { ...updated[newSelected[0]], flipped: false };
            updated[newSelected[1]] = { ...updated[newSelected[1]], flipped: false };
            setCards(updated);
          }

          setSelected([]);
          checkingRef.current = false;
        }, 1000);
      }
    },
    [gameActive, cards, selected, matchedPairs, totalPairs, packageId, saveScore, trackProgress],
  );

  const gridClass =
    totalPairs <= 4
      ? 'grid-4'
      : totalPairs <= 8
        ? 'grid-8'
        : totalPairs <= 10
          ? 'grid-10'
          : totalPairs <= 12
            ? 'grid-12'
            : 'grid-15';

  if (!packageId) {
    return (
      <div className="game-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <p>Aucun package sélectionné.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="game-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
      </div>
    );
  }

  if (gameData?.errorMessage) {
    return (
      <div className="game-container">
        <div className="game-header">
          <h1>Flash Match</h1>
        </div>
        <div className="error-box">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{gameData.errorMessage}</p>
          <button className="btn add-words-btn" onClick={() => router.push(`/words?package=${packageId}`)}>
            Ajouter des mots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Flash Match</h1>
        <p className="game-description">Associez chaque mot avec sa définition</p>
      </div>

      {gameData && (
        <div className="game-stats">
          <div className="stat-box">
            <span className="stat-label">Mots disponibles</span>
            <span className="stat-value">{gameData.wordCount}</span>
          </div>
        </div>
      )}

      <div className="game-area">
        <div className="game-screen">
          {/* Pre-game */}
          {screen === 'pre' && (
            <div className="pre-game-screen active">
              <h2>
                <i className="fas fa-bolt" style={{ color: '#e9e919' }}></i> Règles du jeu
              </h2>
              <ul className="rules-list">
                <li>Associez chaque mot avec sa définition</li>
                <li>Moins vous faites de tentatives, plus votre score sera élevé</li>
                <li>Le temps est également pris en compte dans le calcul du score</li>
                <li>Trouvez toutes les paires pour terminer le jeu</li>
              </ul>
              <button className="start-btn" onClick={startGame}>
                <i className="fas fa-play"></i> Commencer
              </button>
            </div>
          )}

          {/* Active game */}
          {screen === 'active' && (
            <div className="active-game-screen active">
              <div className="game-info">
                <div className="moves-display">
                  <span className="moves-label">Coups</span>
                  <span className="moves-value">{moves}</span>
                </div>
                <div className="timer-display">
                  <span className="timer-label">Temps</span>
                  <span className="timer-value">{formatTime(currentTime)}</span>
                </div>
                <div className="pairs-display">
                  <span className="pairs-label">Paires</span>
                  <span className="pairs-value">
                    {matchedPairs}/{totalPairs}
                  </span>
                </div>
              </div>

              <div className={`game-board ${gridClass}`}>
                {cards.map((card, i) => (
                  <div
                    key={i}
                    className={`card-container${card.flipped ? ' flipped' : ''}${card.matched ? ' matched' : ''}`}
                    onClick={() => flipCard(i)}
                  >
                    <div className="card-inner">
                      <div className="card-front"></div>
                      <div className="card-back">
                        {card.type === 'meaning' ? (
                          <div className="meaning-card">{card.content}</div>
                        ) : (
                          <div className="card-word">{card.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post-game */}
          {screen === 'post' && (
            <div className="post-game-screen active">
              <div className="final-score-container">
                <div className="final-score-label">Paires trouvées</div>
                <span className="final-score">{matchedPairs}</span>
              </div>
              <div className="game-summary">
                <div className="summary-item">
                  <div className="summary-icon">⏱️ Temps</div>
                  <span className="summary-value">{formatTime(currentTime)}</span>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">🎯 Coups</div>
                  <span className="summary-value">{moves}</span>
                </div>
              </div>

              {levelMessage && (
                <div
                  className={`track-level-message ${levelMessage.success ? 'level-completed' : 'level-failed'}`}
                >
                  {levelMessage.text}
                </div>
              )}

              <div className="action-buttons">
                <button className="play-again-btn" onClick={startGame}>
                  <i className="fas fa-redo"></i> Rejouer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="game-footer">
        <button className="btn learn-btn" onClick={() => router.push(`/learn?package=${packageId}`)}>
          <i className="fas fa-arrow-left"></i> Apprendre
        </button>
        <button
          className="btn next-btn"
          onClick={() => router.push(`/games/vocab-quiz?package=${packageId}`)}
        >
          <i className="fas fa-arrow-right"></i> Jeu suivant
        </button>
      </div>
    </div>
  );
}

export default function FlashMatchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </div>
      }
    >
      <FlashMatchContent />
    </Suspense>
  );
}
