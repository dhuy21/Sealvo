import { BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { ImportService, MAX_IMPORT_ROWS } from './import.service.js';

const HEADER = ['Mot', 'Langue', 'Sujet', 'Type', 'Prononciation', 'Signification', 'Exemple', 'Synonymes', 'Antonymes', 'Grammaire', 'Niveau'];

function workbook(rows: unknown[][]): Buffer {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), 'Sheet1');
  return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const row = (overrides: Record<number, unknown> = {}) => {
  const base: unknown[] = ['cat', 'en-US (Anglais)', 'Daily', 'noun', '', 'chat', '', '', '', '', ''];
  for (const [i, v] of Object.entries(overrides)) base[Number(i)] = v;
  return base;
};

describe('ImportService', () => {
  const service = new ImportService();

  it('should map ph.v to ph_v, the level column to the enum and strip the language label', () => {
    const words = service.parseWords(
      workbook([HEADER, row(), row({ 0: 'give up', 3: 'ph.v', 10: '0' }), row({ 10: 'v' })]),
    );

    expect(words).toHaveLength(3);
    expect(words[0]).toMatchObject({ word: 'cat', language_code: 'en-US', type: 'noun', level: undefined });
    expect(words[1]).toMatchObject({ word: 'give up', type: 'ph_v', level: 'level_0' });
    expect(words[2].level).toBe('v');
  });

  it('should reject invalid rows with the old app message listing them', () => {
    const buffer = workbook([
      HEADER,
      row(),
      row({ 1: 'xx', 3: 'thing' }),
      row({ 2: '', 1: 'zz' }),
      row({ 10: '7' }),
    ]);

    let message = '';
    try {
      service.parseWords(buffer);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      message = (err as BadRequestException).message;
    }

    expect(message.split('\n')).toEqual([
      'Langue invalide (2) : lignes 2, 3',
      expect.stringMatching(/^Acceptés : en-US, en-GB, /),
      'Type invalide (1) : lignes 2',
      'Acceptés : noun, verb, adjective, adverb, ph.v, idiom, collocation',
      'Sujet manquant (1) : lignes 3',
      'Niveau invalide (1) : lignes 4',
      'Acceptés : x, 0, 1, 2, v',
    ]);
  });

  it('should reject a cell longer than the column allows', () => {
    expect(() => service.parseWords(workbook([HEADER, row({ 0: 'a'.repeat(256) })]))).toThrow(
      'Mot trop long (255 caractères max) (1) : lignes 1',
    );
  });

  it('should reject a file with no words', () => {
    expect(() => service.parseWords(workbook([HEADER]))).toThrow('Le fichier ne contient aucun mot valide.');
  });

  it(`should reject more than ${MAX_IMPORT_ROWS} rows`, () => {
    const rows = [HEADER, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => row())];
    expect(() => service.parseWords(workbook(rows))).toThrow(`limite de ${MAX_IMPORT_ROWS} mots`);
    expect(service.parseWords(workbook(rows.slice(0, MAX_IMPORT_ROWS + 1)))).toHaveLength(MAX_IMPORT_ROWS);
  });
});
