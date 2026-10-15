'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const GAMES = [
  {
    slug: 'flash-match',
    name: 'Flash Match',
    description: 'Associez les mots à leur traduction en retournant les cartes.',
    icon: '🃏',
    level: 'x',
    color: '#6a11cb',
  },
  {
    slug: 'vocab-quiz',
    name: 'Vocab Quiz',
    description: 'Testez vos connaissances avec des quiz à choix multiples.',
    icon: '❓',
    level: 'x',
    color: '#2575fc',
  },
  {
    slug: 'test-pronun',
    name: 'Test Pronun',
    description: 'Entraînez votre prononciation avec la reconnaissance vocale.',
    icon: '🎤',
    level: 'x',
    color: '#e91e63',
  },
  {
    slug: 'word-scramble',
    name: 'Word Scramble',
    description: 'Remettez les lettres dans le bon ordre.',
    icon: '🔤',
    level: '0',
    color: '#ff9800',
  },
  {
    slug: 'phrase-completion',
    name: 'Phrase Completion',
    description: 'Complétez les phrases avec le bon mot.',
    icon: '📝',
    level: '0',
    color: '#4caf50',
  },
  {
    slug: 'speed-vocab',
    name: 'Speed Vocab',
    description: 'Tapez les mots le plus vite possible.',
    icon: '⚡',
    level: '1',
    color: '#ff5722',
  },
  {
    slug: 'word-search',
    name: 'Word Search',
    description: 'Trouvez les mots cachés dans la grille.',
    icon: '🔍',
    level: '2',
    color: '#009688',
  },
];

function GamesHub() {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package');

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
          🎮 Mini-Jeux
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '2rem' }}>
          Choisissez un jeu pour réviser votre vocabulaire
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}${packageId ? `?package=${packageId}` : ''}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  borderRadius: 16,
                  padding: '1.5rem',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${game.color}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{game.icon}</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {game.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.75rem' }}>
                  {game.description}
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: `${game.color}22`,
                    color: game.color,
                  }}
                >
                  Niveau {game.level}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense>
      <GamesHub />
    </Suspense>
  );
}
