'use client';

import { displayWordType } from '@/lib/word-type';
import { FlashcardHint } from './FlashcardHint';
import { PronunciationButton } from './PronunciationButton';
import type { ReviewWord } from '@/hooks/use-words';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export type LearnMode = 'word-to-meaning' | 'meaning-to-word';

export function Flashcard({
  word,
  mode,
  hintMode,
  flipped,
  updating,
  animation,
  onToggle,
}: {
  word: ReviewWord;
  /** Mode the card was drawn with. */
  mode: LearnMode;
  /** Mode currently selected; the hint follows it even before the card is redrawn. */
  hintMode: LearnMode;
  flipped: boolean;
  updating: boolean;
  animation: string;
  onToggle: () => void;
}) {
  const front = mode === 'word-to-meaning' ? word.word : word.meaning;
  const back = mode === 'word-to-meaning' ? word.meaning : word.word;
  const type = displayWordType(word.type);
  const classes = [
    'flashcard',
    `${mode}-mode`,
    flipped && 'flipped',
    updating && 'updating',
    animation,
  ];

  return (
    <div className={cx(styles, ...classes)} onClick={onToggle}>
      <div className={cx(styles, 'flashcard-inner')}>
        <div className={cx(styles, 'flashcard-front')}>
          <span className={cx(styles, 'card-type')}>{type}</span>
          <span className={cx(styles, 'card-language')}>{word.language_code}</span>
          <h2 className={cx(styles, 'card-content')}>{front}</h2>
          <FlashcardHint
            target={hintMode === 'word-to-meaning' ? word.meaning : word.word}
            autoHide={hintMode === 'meaning-to-word'}
          />
          <p className={cx(styles, 'card-prompt')}>Cliquez pour voir la traduction</p>
        </div>
        <div className={cx(styles, 'flashcard-back')}>
          <span className={cx(styles, 'card-type')}>{type}</span>
          <span className={cx(styles, 'card-language')}>{word.language_code}</span>
          <h2 className={cx(styles, 'card-content')}>{back}</h2>
          <div className={cx(styles, 'card-details')}>
            <p>
              <strong>Exemple:</strong>{' '}
              <span className={cx(styles, 'example-text')}>{word.example}</span>
            </p>
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
            {word.pronunciation && (
              <>
                <p>
                  <strong>Prononciation:</strong>{' '}
                  <span className={cx(styles, 'pronunciation-text')}>{word.pronunciation}</span>
                </p>
                <PronunciationButton text={word.word} language={word.language_code}>
                  Écouter
                </PronunciationButton>
              </>
            )}
            {word.example && (
              <PronunciationButton text={word.example} language={word.language_code}>
                Écouter l&apos;exemple
              </PronunciationButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
