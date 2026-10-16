import type { GameWord } from '@/hooks/use-games';
import { shuffleArray } from '@/lib/shuffle';
import { formatTypeMeaning } from '@/lib/word-type';
import type { Question } from './QuizQuestion';

const OPTIONS_COUNT = 6;
const MAX_QUESTIONS = 300;

export const NOT_ENOUGH_WORDS_MESSAGE = `Vous devez avoir au moins ${OPTIONS_COUNT} mots au niveau x dans votre vocabulaire pour jouer à ce niveau de difficulté.`;

export function hasEnoughWords(words: GameWord[]): boolean {
  return words.length >= OPTIONS_COUNT;
}

/**
 * One question per word, each drawn independently (a word can be asked several times):
 * the first word of a fresh shuffle is asked, the next five are the wrong options.
 * `correctIndex` gets one entry (the first option with that text) for the asked word and for each
 * other option whose word text equals it; the player must pick that many options.
 * The round is then repeated until the quiz length is reached.
 */
export function generateQuestions(words: GameWord[]): Question[] {
  const round = words.map((): Question => {
    const [asked, ...others] = shuffleArray(words);
    const correctMeanings = [formatTypeMeaning(asked.type, asked.meaning)];
    const options = [correctMeanings[0]];

    for (const w of others.slice(0, OPTIONS_COUNT - 1)) {
      const meaning = formatTypeMeaning(w.type, w.meaning);
      if (w.word === asked.word) correctMeanings.push(meaning);
      options.push(meaning);
    }

    const shuffled = shuffleArray(options);
    return {
      word: asked.word,
      options: shuffled,
      correctIndex: correctMeanings.map((m) => shuffled.indexOf(m)),
    };
  });

  const total = Math.min(words.length, MAX_QUESTIONS) + Math.floor(0.5 * words.length);
  return Array.from({ length: total }, (_, i) => round[i % round.length]);
}
