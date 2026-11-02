import { describe, expect, it } from 'vitest';
import { gameWord } from '@/test-utils/fixtures';
import { mockRandom, seedRandom } from '@/test-utils/random';
import {
  escapeHtml,
  generatePhrases,
  isCorrectAnswer,
  repeatPhrases,
  revealAnswers,
  type Phrase,
} from './phrases';

const phrase = (overrides: Partial<Phrase>): Phrase => ({
  phrase: '',
  word: 'w',
  meaningWord: 'm',
  correctWords: [],
  ...overrides,
});

describe('escapeHtml', () => {
  it('escapes &, <, > and double quotes', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
  });
});

describe('generatePhrases', () => {
  it('blanks every **marked** word of the example, in order', () => {
    seedRandom(1);
    const [p] = generatePhrases([
      gameWord(1, { word: 'run', meaning: 'courir', example: 'I **run** and **jump** daily' }),
    ]);
    expect(p).toEqual({
      phrase: 'I _____ and _____ daily',
      word: 'run',
      meaningWord: 'courir',
      correctWords: ['run', 'jump'],
    });
  });

  it('skips words whose example is missing, blank or has no marker', () => {
    seedRandom(2);
    const phrases = generatePhrases([
      gameWord(1, { example: null }),
      gameWord(2, { example: '   ' }),
      gameWord(3, { example: 'No marker here' }),
      gameWord(4, { example: 'A **marked** one' }),
    ]);
    expect(phrases.map((p) => p.word)).toEqual(['word4']);
  });

  it('shuffles the phrases', () => {
    // [1, 2, 3] → [2, 3, 1]
    mockRandom(0, 0);
    const words = [1, 2, 3].map((id) => gameWord(id, { example: 'A **marked** one' }));
    expect(generatePhrases(words).map((p) => p.word)).toEqual(['word2', 'word3', 'word1']);
  });
});

describe('repeatPhrases', () => {
  it('cycles through the phrases until the count is reached', () => {
    const a = phrase({ word: 'a' });
    const b = phrase({ word: 'b' });
    expect(repeatPhrases([a, b], 5)).toEqual([a, b, a, b, a]);
    expect(repeatPhrases([a, b], 1)).toEqual([a]);
    expect(repeatPhrases([a, b], 0)).toEqual([]);
  });
});

describe('revealAnswers', () => {
  it('fills the blanks in order with the answers in spans of the given class, escaped', () => {
    const p = phrase({ phrase: 'A _____ & a _____', correctWords: ['<cat>', 'dog'] });
    expect(revealAnswers(p, 'blank correct')).toBe(
      'A <span class="blank correct">&lt;cat&gt;</span> &amp; a <span class="blank correct">dog</span>',
    );
  });

  it('inserts answers containing $ patterns literally', () => {
    const p = phrase({ phrase: 'Pay _____ now', correctWords: ["$&$'"] });
    expect(revealAnswers(p, 'x')).toBe(`Pay <span class="x">$&amp;$'</span> now`);
  });

  it('leaves a phrase without blanks unchanged', () => {
    expect(revealAnswers(phrase({ phrase: 'Plain "text"' }), 'x')).toBe('Plain &quot;text&quot;');
  });
});

describe('isCorrectAnswer', () => {
  it('compares the answers in order, ignoring case and spaces around them', () => {
    expect(isCorrectAnswer(' Paris ', ['paris'])).toBe(true);
    expect(isCorrectAnswer('take ; OFF', ['take', 'off'])).toBe(true);
    expect(isCorrectAnswer('off; take', ['take', 'off'])).toBe(false);
  });

  it('needs one answer per blank', () => {
    expect(isCorrectAnswer('take', ['take', 'off'])).toBe(false);
    expect(isCorrectAnswer('take; off; now', ['take', 'off'])).toBe(false);
  });
});
