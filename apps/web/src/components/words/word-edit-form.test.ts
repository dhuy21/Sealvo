import { describe, expect, it } from 'vitest';
import type { Word } from '@/hooks/use-words';
import { toUpdatePayload, wordEditForm, type WordEditForm } from './word-edit-form';

const word = {
  detail_id: 1,
  word: 'apple',
  language_code: 'en-US',
  type: 'noun',
  meaning: 'pomme',
  pronunciation: null,
  synonyms: 'fruit',
  antonyms: null,
  example: 'An **apple** a day',
  grammar: null,
  level: 'x',
} as Word;

const form: WordEditForm = {
  word: 'apple',
  language_code: 'en-US',
  type: 'noun',
  meaning: 'pomme',
  pronunciation: '',
  synonyms: 'fruit',
  antonyms: '',
  example: 'An **apple** a day',
  grammar: '',
};

describe('wordEditForm', () => {
  it('starts from the word, null fields as empty strings', () => {
    expect(wordEditForm(word)).toEqual(form);
  });
});

describe('toUpdatePayload', () => {
  it('trims every field', () => {
    expect(toUpdatePayload({ ...form, word: '  apple ', grammar: ' n. ' })).toEqual({
      ...form,
      grammar: 'n.',
    });
  });

  it.each(['word', 'language_code', 'type', 'meaning', 'example'] as const)(
    'is null when the required field %s is blank',
    (field) => {
      expect(toUpdatePayload({ ...form, [field]: '   ' })).toBeNull();
    },
  );

  it('accepts blank optional fields', () => {
    expect(toUpdatePayload({ ...form, synonyms: ' ' })).toEqual({ ...form, synonyms: '' });
  });
});
