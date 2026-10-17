import { BadRequestException } from '@nestjs/common';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import * as xlsx from 'xlsx';
import { ImportService, MAX_IMPORT_ROWS, MAX_UNCOMPRESSED_BYTES } from './import.service.js';

const HEADER = [
  'Mot',
  'Langue',
  'Sujet',
  'Type',
  'Prononciation',
  'Signification',
  'Exemple',
  'Synonymes',
  'Antonymes',
  'Grammaire',
  'Niveau',
];

function workbook(rows: unknown[][]): Buffer {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), 'Sheet1');
  return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const row = (overrides: Record<number, unknown> = {}) => {
  const base: unknown[] = [
    'cat',
    'en-US (Anglais)',
    'Daily',
    'noun',
    '',
    'chat',
    '',
    '',
    '',
    '',
    '',
  ];
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
    expect(words[0]).toMatchObject({
      word: 'cat',
      language_code: 'en-US',
      type: 'noun',
      level: undefined,
    });
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
    expect(() => service.parseWords(workbook([HEADER]))).toThrow(
      'Le fichier ne contient aucun mot valide.',
    );
  });

  it(`should reject more than ${MAX_IMPORT_ROWS} rows`, () => {
    const rows = [HEADER, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => row())];
    expect(() => service.parseWords(workbook(rows))).toThrow(`limite de ${MAX_IMPORT_ROWS} mots`);
    expect(service.parseWords(workbook(rows.slice(0, MAX_IMPORT_ROWS + 1)))).toHaveLength(
      MAX_IMPORT_ROWS,
    );
  });

  it('should not count blank separator rows against the limit', () => {
    const words = Array.from({ length: MAX_IMPORT_ROWS }, (_, i) => row({ 0: `w${i}` }));
    const rows = [HEADER, ...words.flatMap((w, i) => (i % 50 === 0 ? [[], w] : [w]))];

    expect(service.parseWords(workbook(rows))).toHaveLength(MAX_IMPORT_ROWS);
  });

  it('should keep a word far below the first rows instead of dropping it', () => {
    const rows: unknown[][] = [HEADER, row({ 0: 'first' })];
    rows[700] = row({ 0: 'far' });

    expect(service.parseWords(workbook(rows)).map((w) => w.word)).toEqual(['first', 'far']);
  });

  it('should parse a tiny sheet that declares the whole grid as its range quickly', () => {
    const files = unzipSync(workbook([HEADER, row()]));
    files['xl/worksheets/sheet1.xml'] = strToU8(
      strFromU8(files['xl/worksheets/sheet1.xml'])
        .replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:XFD1048576"/>')
        .replace(
          '</sheetData>',
          '<row r="1048576"><c r="XFD1048576" t="inlineStr"><is><t>x</t></is></c></row></sheetData>',
        ),
    );
    const sparse = Buffer.from(zipSync(files));

    const start = performance.now();
    expect(service.parseWords(sparse)).toHaveLength(1);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('should reject a zip bomb that declares small sizes', () => {
    const bomb = Buffer.from(
      zipSync({ 'xl/worksheets/sheet1.xml': new Uint8Array(MAX_UNCOMPRESSED_BYTES + 1) }),
    );
    // Lie in the local and central headers: the entry claims to inflate to 1 byte
    for (let i = 0; i < bomb.length - 4; i++) {
      const signature = bomb.readUInt32LE(i);
      if (signature === 0x04034b50) bomb.writeUInt32LE(1, i + 22);
      if (signature === 0x02014b50) bomb.writeUInt32LE(1, i + 24);
    }

    expect(() => service.parseWords(bomb)).toThrow(
      new BadRequestException('Le fichier est trop volumineux une fois décompressé.'),
    );
  });

  it('should reject a small zip that inflates past the uncompressed limit', () => {
    const bomb = Buffer.from(
      zipSync({ 'xl/worksheets/sheet1.xml': new Uint8Array(MAX_UNCOMPRESSED_BYTES + 1) }),
    );

    expect(bomb.length).toBeLessThan(100 * 1024);
    expect(() => service.parseWords(bomb)).toThrow(
      new BadRequestException('Le fichier est trop volumineux une fois décompressé.'),
    );
  });

  it('should still parse a legacy .xls, which is not a zip', () => {
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet([HEADER, row()]), 'Sheet1');
    const xls = xlsx.write(book, { type: 'buffer', bookType: 'biff8' }) as Buffer;

    expect(service.parseWords(xls)).toHaveLength(1);
  });
});
