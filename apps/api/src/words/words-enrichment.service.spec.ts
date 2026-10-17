import { replaceExample } from './words-enrichment.service.js';

describe('replaceExample', () => {
  it('should merge examples by index id (numeric or string) and ignore invalid entries', () => {
    const words = [{ example: '' }, { example: 'I run' }, { example: 'keep me' }];

    replaceExample(words, [
      { id: 0, example: 'The **cat** sleeps.' },
      { id: '1', example: 'I **ran** home.' },
      { id: 2, example: null },
      { id: 7, example: 'unknown word' },
    ]);

    expect(words.map((w) => w.example)).toEqual([
      'The **cat** sleeps.',
      'I **ran** home.',
      'keep me',
    ]);
  });
});
