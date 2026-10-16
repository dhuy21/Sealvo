'use client';

import { useState } from 'react';
import type { Word } from '@/hooks/use-words';

export type LearnMode = 'word-to-meaning' | 'meaning-to-word';

export function Flashcard({
  word,
  mode,
  onKnow,
  onReview,
}: {
  word: Word;
  mode: LearnMode;
  onKnow: () => void;
  onReview: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

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
