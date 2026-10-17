import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWordDto } from './create-word.dto.js';
import { UpdateWordDto } from './update-word.dto.js';

const invalidFields = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body), { whitelist: true, forbidNonWhitelisted: true }))
    .map((e) => e.property)
    .sort();

const validWord = {
  word: 'cat',
  language_code: 'en-US',
  subject: 'Daily',
  type: 'noun',
  meaning: 'chat',
};

describe('CreateWordDto', () => {
  it('accepts a word without optional fields, and null optional text fields', async () => {
    await expect(invalidFields(CreateWordDto, validWord)).resolves.toEqual([]);
    await expect(invalidFields(CreateWordDto, { ...validWord, example: null })).resolves.toEqual(
      [],
    );
  });

  it('rejects a null level', async () => {
    await expect(invalidFields(CreateWordDto, { ...validWord, level: null })).resolves.toEqual([
      'level',
    ]);
  });
});

describe('UpdateWordDto', () => {
  it('accepts an empty update and a partial one', async () => {
    await expect(invalidFields(UpdateWordDto, {})).resolves.toEqual([]);
    await expect(invalidFields(UpdateWordDto, { meaning: 'félin', level: 'v' })).resolves.toEqual(
      [],
    );
  });

  it('rejects null on non-nullable columns', async () => {
    const nulls = {
      word: null,
      language_code: null,
      subject: null,
      type: null,
      meaning: null,
      level: null,
    };
    await expect(invalidFields(UpdateWordDto, nulls)).resolves.toEqual(Object.keys(nulls).sort());
  });

  it('accepts null on nullable text columns', async () => {
    await expect(
      invalidFields(UpdateWordDto, { pronunciation: null, synonyms: null, example: null }),
    ).resolves.toEqual([]);
  });

  it('keeps the create rules: non-empty subject and meaning, known level, no extra field', async () => {
    await expect(
      invalidFields(UpdateWordDto, { subject: '', meaning: '', level: 'level_9', extra: 1 }),
    ).resolves.toEqual(['extra', 'level', 'meaning', 'subject']);
  });
});
