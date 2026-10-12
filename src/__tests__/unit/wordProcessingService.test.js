const geminiService = require('../../app/services/gemini');
const wordModel = require('../../app/models/words');
const cache = require('../../app/core/cache');

jest.mock('../../app/services/gemini');
jest.mock('../../app/models/words');
jest.mock('../../app/core/cache');

const {
  enrichWithGemini,
  enrichSingleWord,
  saveWords,
  processWords,
} = require('../../app/services/wordProcessingService');

beforeEach(() => jest.clearAllMocks());

const makeWord = (overrides = {}) => ({
  id: 1,
  word: 'hello',
  language_code: 'en',
  subject: 'Daily',
  type: 'noun',
  meaning: 'salut',
  example: '',
  level: 'A1',
  pronunciation: '',
  synonym: '',
  antonym: '',
  grammar_note: '',
  ...overrides,
});

describe('wordProcessingService (unit)', () => {
  describe('enrichWithGemini', () => {
    it('generates examples for words missing examples', async () => {
      geminiService.generateExemple.mockResolvedValue([{ id: 1, example: 'Hello world!' }]);
      geminiService.replaceExample.mockImplementation((words, gen) => {
        words[0].example = gen[0].example;
        return words;
      });

      const result = await enrichWithGemini([makeWord()]);
      expect(geminiService.generateExemple).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1, word: 'hello' }),
      ]);
      expect(result[0].example).toBe('Hello world!');
    });

    it('corrects existing examples via modifyExample', async () => {
      geminiService.modifyExample.mockResolvedValue([{ id: 2, example: 'Corrected' }]);
      geminiService.replaceExample.mockImplementation((words, gen) => {
        words[0].example = gen[0].example;
        return words;
      });

      const result = await enrichWithGemini([makeWord({ id: 2, example: 'bad example' })]);
      expect(geminiService.modifyExample).toHaveBeenCalled();
      expect(result[0].example).toBe('Corrected');
    });

    it('skips words missing required fields', async () => {
      const result = await enrichWithGemini([makeWord({ meaning: '' })]);
      expect(geminiService.generateExemple).not.toHaveBeenCalled();
      expect(geminiService.modifyExample).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('continues gracefully if Gemini throws', async () => {
      geminiService.generateExemple.mockRejectedValue(new Error('API quota'));
      const result = await enrichWithGemini([makeWord()]);
      expect(result).toHaveLength(1);
      expect(result[0].example).toBe('');
    });
  });

  describe('enrichSingleWord', () => {
    it('generates example when word has empty example', async () => {
      geminiService.generateExemple.mockResolvedValue([{ id: 1, example: 'Generated' }]);
      const result = await enrichSingleWord(makeWord());
      expect(result.example).toBe('Generated');
    });

    it('corrects existing example via modifyExample', async () => {
      geminiService.modifyExample.mockResolvedValue([{ id: 1, example: 'Fixed' }]);
      const result = await enrichSingleWord(makeWord({ example: 'rough draft' }));
      expect(result.example).toBe('Fixed');
    });

    it('returns word as-is when missing required fields', async () => {
      const w = makeWord({ word: '' });
      const result = await enrichSingleWord(w);
      expect(result).toEqual(w);
      expect(geminiService.generateExemple).not.toHaveBeenCalled();
    });

    it('handles Gemini error gracefully', async () => {
      geminiService.generateExemple.mockRejectedValue(new Error('timeout'));
      const result = await enrichSingleWord(makeWord());
      expect(result.example).toBe('');
    });
  });

  describe('saveWords', () => {
    it('saves valid words and returns counts', async () => {
      wordModel.create.mockResolvedValue(true);
      const words = [makeWord({ id: 1 }), makeWord({ id: 2 })];
      const result = await saveWords(words, 10);
      expect(result).toEqual({ successCount: 2, errChamps: 0 });
      expect(wordModel.create).toHaveBeenCalledTimes(2);
    });

    it('counts invalid words as errChamps', async () => {
      const words = [makeWord({ word: '' }), makeWord()];
      wordModel.create.mockResolvedValue(true);
      const result = await saveWords(words, 10);
      expect(result).toEqual({ successCount: 1, errChamps: 1 });
    });

    it('counts DB errors as errChamps', async () => {
      wordModel.create.mockRejectedValue(new Error('DUPLICATE'));
      const result = await saveWords([makeWord()], 10);
      expect(result).toEqual({ successCount: 0, errChamps: 1 });
    });

    it('calls onProgress callback for each word', async () => {
      wordModel.create.mockResolvedValue(true);
      const onProgress = jest.fn();
      await saveWords([makeWord(), makeWord()], 10, { onProgress });
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(1, 2);
      expect(onProgress).toHaveBeenCalledWith(2, 2);
    });

    it('defaults level to "x" when missing', async () => {
      wordModel.create.mockResolvedValue(true);
      await saveWords([makeWord({ level: undefined })], 10);
      expect(wordModel.create.mock.calls[0][0].level).toBe('x');
    });
  });

  describe('processWords', () => {
    beforeEach(() => {
      geminiService.generateExemple.mockResolvedValue([]);
      geminiService.modifyExample.mockResolvedValue([]);
      wordModel.create.mockResolvedValue(true);
      cache.del.mockResolvedValue(true);
    });

    it('orchestrates: enrich → save → invalidate cache', async () => {
      const result = await processWords([makeWord()], 10, 42);

      expect(result.successCount).toBe(1);
      expect(cache.del).toHaveBeenCalledWith(['dashboard:42', 'words:10']);
    });

    it('does not invalidate cache when nothing saved', async () => {
      wordModel.create.mockRejectedValue(new Error('err'));
      await processWords([makeWord()], 10, 42);
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('calls onPhase callback for gemini and saving phases', async () => {
      const onPhase = jest.fn();
      await processWords([makeWord()], 10, 42, { onPhase });
      expect(onPhase).toHaveBeenCalledWith('gemini', 0, 1);
      expect(onPhase).toHaveBeenCalledWith('saving', 0, 1);
    });

    it('calls onProgress callback during save', async () => {
      const onProgress = jest.fn();
      await processWords([makeWord(), makeWord()], 10, 42, { onProgress });
      expect(onProgress).toHaveBeenCalledTimes(2);
    });
  });
});
