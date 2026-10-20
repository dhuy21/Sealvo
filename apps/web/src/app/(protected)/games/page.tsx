'use client';

import Link from 'next/link';
import { Suspense, type CSSProperties } from 'react';
import { ALL_GAME_TYPES, GAME_LEVEL, levelLabel, type GameType } from '@sealvo/shared';
import { usePackageIdParam } from '@/hooks/use-package-id-param';
import styles from '@/styles/games/games-hub.module.css';

const GAME_CARDS: Record<
  GameType,
  { name: string; description: string; icon: string; color: string }
> = {
  flash_match: {
    name: 'Memory Match',
    description: 'Associez les mots à leur traduction en retournant les cartes.',
    icon: '🃏',
    color: '#6a11cb',
  },
  vocab_quiz: {
    name: 'Quiz de Vocabulaire',
    description: 'Testez vos connaissances avec des quiz à choix multiples.',
    icon: '❓',
    color: '#2575fc',
  },
  test_pronun: {
    name: 'Défi Prononcial',
    description: 'Entraînez votre prononciation avec la reconnaissance vocale.',
    icon: '🎤',
    color: '#e91e63',
  },
  word_scramble: {
    name: 'Mots Mélangés',
    description: 'Remettez les lettres dans le bon ordre.',
    icon: '🔤',
    color: '#ff9800',
  },
  phrase_completion: {
    name: 'Complétion de Phrase',
    description: 'Complétez les phrases avec le bon mot.',
    icon: '📝',
    color: '#4caf50',
  },
  speed_vocab: {
    name: 'Vitesse Vocab',
    description: 'Tapez les mots le plus vite possible.',
    icon: '⚡',
    color: '#ff5722',
  },
  word_search: {
    name: 'Mots Cachés',
    description: 'Trouvez les mots cachés dans la grille.',
    icon: '🔍',
    color: '#009688',
  },
};

/** Route segments are the game types with dashes (`flash_match` → `/games/flash-match`) */
const GAMES = ALL_GAME_TYPES.map((type) => ({
  ...GAME_CARDS[type],
  slug: type.replaceAll('_', '-'),
  level: levelLabel(GAME_LEVEL[type]),
}));

/** The game color, and with 20% / 13% alpha for the hover shadow and the level badge */
const cardColors = (color: string) =>
  ({
    '--game-color': color,
    '--game-shadow': `${color}33`,
    '--game-tint': `${color}22`,
  }) as CSSProperties;

function GamesHub() {
  const packageId = usePackageIdParam();

  return (
    <div className={styles.hub}>
      <div className={styles.content}>
        <h1 className={styles.title}>🎮 Mini-Jeux</h1>
        <p className={styles.subtitle}>Choisissez un jeu pour réviser votre vocabulaire</p>

        <div className={styles.grid}>
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}${packageId ? `?package=${packageId}` : ''}`}
              className={styles.link}
            >
              <div className={styles.card} style={cardColors(game.color)}>
                <div className={styles.icon}>{game.icon}</div>
                <h3 className={styles.name}>{game.name}</h3>
                <p className={styles.description}>{game.description}</p>
                <span className={styles.level}>Niveau {game.level}</span>
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
