import { describe, expect, it } from 'vitest';
import { gameWord } from '@/test-utils/fixtures';
import { seedRandom } from '@/test-utils/random';
import { NOT_ENOUGH_WORDS_MESSAGE, generateQuestions, hasEnoughWords } from './generate-questions';

const words = (count: number) => Array.from({ length: count }, (_, i) => gameWord(i + 1));

describe('hasEnoughWords', () => {
  it('needs at least six words', () => {
    expect(hasEnoughWords(words(5))).toBe(false);
    expect(hasEnoughWords(words(6))).toBe(true);
  });

  it('explains the six-word minimum', () => {
    expect(NOT_ENOUGH_WORDS_MESSAGE).toContain('au moins 6 mots');
  });
});

describe('generateQuestions', () => {
  it('asks min(n, 300) + floor(n / 2) questions, repeating the first round in order', () => {
    seedRandom(42);
    const questions = generateQuestions(words(7));
    expect(questions).toHaveLength(7 + 3);
    expect(questions.slice(7)).toEqual(questions.slice(0, 3));

    seedRandom(7);
    expect(generateQuestions(words(700))).toHaveLength(300 + 350);
  });

  it('offers six distinct meanings, with the asked word meaning at correctIndex', () => {
    seedRandom(3);
    const pool = words(10);
    for (const q of generateQuestions(pool)) {
      const asked = pool.find((w) => w.word === q.word)!;
      expect(q.options).toHaveLength(6);
      expect(new Set(q.options).size).toBe(6);
      expect(q.correctIndex).toEqual([q.options.indexOf(`noun : ${asked.meaning}`)]);
    }
  });

  it('formats options as "type : meaning", with phrasal verbs shown as ph.v', () => {
    seedRandom(5);
    const pool = words(6).map((w) => ({ ...w, type: 'ph_v' as const }));
    const [q] = generateQuestions(pool);
    expect(q.options.every((o) => o.startsWith('ph.v : '))).toBe(true);
  });

  it('expects every option whose word has the same text as the asked word', () => {
    seedRandom(11);
    const pool = [
      ...words(5),
      gameWord(6, { word: 'bank', meaning: 'river side' }),
      gameWord(7, { word: 'bank', meaning: 'money place' }),
    ];
    const bankQuestions = generateQuestions(pool).filter((q) => q.word === 'bank');
    expect(bankQuestions.length).toBeGreaterThan(0);

    for (const q of bankQuestions) {
      const bankOptions = q.options
        .map((o, i) => (o === 'noun : river side' || o === 'noun : money place' ? i : -1))
        .filter((i) => i >= 0);
      expect([...q.correctIndex].sort()).toEqual(bankOptions);
    }
  });

  it('is reproducible for the same random sequence', () => {
    seedRandom(99);
    const first = generateQuestions(words(8));
    seedRandom(99);
    expect(generateQuestions(words(8))).toEqual(first);
  });
});
