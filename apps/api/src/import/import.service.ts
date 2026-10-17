import { BadRequestException, Injectable } from '@nestjs/common';
import { Unzip, UnzipInflate } from 'fflate';
import * as xlsx from 'xlsx';
import {
  VALID_LANGS,
  VALID_LEVELS,
  VALID_TYPES,
  levelFromDb,
  wordTypeFromDb,
  type DbLevel,
  type DbWordType,
} from '@sealvo/shared';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';
import {
  TEXT_MAX_LENGTH,
  VARCHAR_MAX_LENGTH,
} from '../common/constants/field-lengths.constants.js';

export const MAX_IMPORT_ROWS = 500;

/** Total uncompressed size allowed for an .xlsx, against decompression bombs */
export const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const INFLATE_INPUT_CHUNK_BYTES = 16 * 1024;
/** Mot … Niveau: the 11 columns of the import template */
const LAST_COLUMN_INDEX = 10;

/** One spreadsheet row, with the old app's column values (type `ph.v`, level `0`) */
export interface ParsedWord {
  word: string;
  language_code: string;
  subject: string;
  type: string;
  pronunciation: string;
  meaning: string;
  example: string;
  synonyms: string;
  antonyms: string;
  grammar: string;
  level: string;
}

export interface ImportRowError {
  row: number;
  word: string;
  field: keyof typeof FIELD_INFO;
  value: unknown;
}

const FIELD_INFO = {
  word: { label: 'Mot manquant' },
  meaning: { label: 'Signification manquante' },
  subject: { label: 'Sujet manquant' },
  language_code: { label: 'Langue invalide', accepted: VALID_LANGS },
  type: { label: 'Type invalide', accepted: VALID_TYPES },
  level: { label: 'Niveau invalide', accepted: VALID_LEVELS },
  word_length: { label: `Mot trop long (${VARCHAR_MAX_LENGTH} caractères max)` },
  subject_length: { label: `Sujet trop long (${VARCHAR_MAX_LENGTH} caractères max)` },
  pronunciation_length: {
    label: `Prononciation trop longue (${VARCHAR_MAX_LENGTH} caractères max)`,
  },
  meaning_length: { label: `Signification trop longue (${TEXT_MAX_LENGTH} caractères max)` },
  example_length: { label: `Exemple trop long (${TEXT_MAX_LENGTH} caractères max)` },
  synonyms_length: { label: `Synonymes trop longs (${TEXT_MAX_LENGTH} caractères max)` },
  antonyms_length: { label: `Antonymes trop longs (${TEXT_MAX_LENGTH} caractères max)` },
  grammar_length: { label: `Grammaire trop longue (${TEXT_MAX_LENGTH} caractères max)` },
} as const satisfies Record<string, { label: string; accepted?: readonly string[] }>;

/** Matches the column sizes enforced by CreateWordDto (VARCHAR_MAX_LENGTH and TEXT_MAX_LENGTH). */
const FIELD_MAX: Partial<
  Record<keyof ParsedWord, { field: keyof typeof FIELD_INFO; max: number }>
> = {
  word: { field: 'word_length', max: VARCHAR_MAX_LENGTH },
  subject: { field: 'subject_length', max: VARCHAR_MAX_LENGTH },
  pronunciation: { field: 'pronunciation_length', max: VARCHAR_MAX_LENGTH },
  meaning: { field: 'meaning_length', max: TEXT_MAX_LENGTH },
  example: { field: 'example_length', max: TEXT_MAX_LENGTH },
  synonyms: { field: 'synonyms_length', max: TEXT_MAX_LENGTH },
  antonyms: { field: 'antonyms_length', max: TEXT_MAX_LENGTH },
  grammar: { field: 'grammar_length', max: TEXT_MAX_LENGTH },
};

type Cell = string | number | boolean | null | undefined;

const cell = (value: Cell) => (value != null ? String(value).trim() : '');

/**
 * Parsing and validation of an uploaded word spreadsheet.
 * Source: importQueue.js parseExcelFile() + wordProcessingService.js validateWords() / formatValidationErrors()
 */
@Injectable()
export class ImportService {
  /** Parse, validate and map the file to words ready for WordsService.addWords. Throws 400 on any invalid row. */
  parseWords(buffer: Buffer): CreateWordDto[] {
    const words = this.parseExcelBuffer(buffer);
    if (words.length === 0) {
      throw new BadRequestException('Le fichier ne contient aucun mot valide.');
    }

    const errors = this.validateWords(words);
    if (errors.length > 0) {
      throw new BadRequestException(this.formatValidationErrors(errors));
    }

    return words.map(({ type, level, ...w }) => ({
      ...w,
      type: wordTypeFromDb(type as DbWordType),
      level: level === '' ? undefined : levelFromDb(level as DbLevel),
    }));
  }

  parseExcelBuffer(buffer: Buffer): ParsedWord[] {
    this.assertUncompressedSize(buffer);
    // The whole sheet is read (its real size is bounded above): cutting it at a row count would drop
    // the words below the cut without an error
    const workbook = xlsx.read(buffer, { type: 'buffer', dense: true });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = worksheet?.['!ref'] ? this.readRows(worksheet) : [];

    if (!data.length) return [];

    const startRow = data[0]?.[0] === 'Mot' || data[0]?.[0] === 'Word' ? 1 : 0;

    const words: ParsedWord[] = [];
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || cell(row[0]) === '') continue;

      words.push({
        word: cell(row[0]),
        language_code: cell(row[1])
          .replace(/\([^)]*\)/g, '')
          .trim(),
        subject: cell(row[2]),
        type: cell(row[3]),
        pronunciation: cell(row[4]),
        meaning: cell(row[5]),
        example: cell(row[6]),
        synonyms: cell(row[7]),
        antonyms: cell(row[8]),
        grammar: cell(row[9]),
        level: cell(row[10]),
      });
    }

    // Blank rows (separators) do not count: only the words do
    if (words.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Le fichier dépasse la limite de ${MAX_IMPORT_ROWS} mots par import.`,
      );
    }
    return words;
  }

  /**
   * Rows of the columns the import reads (A to K). The sheet's declared range can span XFD1048576
   * in a tiny file, and sheet_to_json walks every cell of that range.
   */
  private readRows(worksheet: xlsx.WorkSheet): Cell[][] {
    const range = xlsx.utils.decode_range(worksheet['!ref']!);
    range.e.c = Math.min(range.e.c, range.s.c + LAST_COLUMN_INDEX);
    return xlsx.utils.sheet_to_json<Cell[]>(worksheet, { header: 1, range, blankrows: false });
  }

  /**
   * Rejects an .xlsx that inflates to more than MAX_UNCOMPRESSED_BYTES. The bytes are counted while
   * inflating (and dropped), not taken from the sizes the zip declares: a crafted file can lie about those.
   */
  private assertUncompressedSize(buffer: Buffer): void {
    // Legacy .xls is not a zip: the upload size limit already bounds it
    if (!ZIP_SIGNATURE.every((byte, i) => buffer[i] === byte)) return;

    let total = 0;
    let exceeded = false;
    const unzip = new Unzip((file) => {
      file.ondata = (error, chunk) => {
        if (error || exceeded) return;
        total += chunk.length;
        if (total > MAX_UNCOMPRESSED_BYTES) {
          exceeded = true;
          file.terminate();
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    try {
      // Fed in small pieces: each push inflates at most ~1000× its input, so memory stays bounded
      for (let start = 0; start < buffer.length && !exceeded; start += INFLATE_INPUT_CHUNK_BYTES) {
        const end = Math.min(start + INFLATE_INPUT_CHUNK_BYTES, buffer.length);
        unzip.push(buffer.subarray(start, end), end === buffer.length);
      }
    } catch {
      /* malformed zip: xlsx.read reports it as before */
    }
    if (exceeded) {
      throw new BadRequestException('Le fichier est trop volumineux une fois décompressé.');
    }
  }

  validateWords(words: ParsedWord[]): ImportRowError[] {
    const errors: ImportRowError[] = [];
    words.forEach((w, i) => {
      const row = i + 1;
      const label = w.word || `(ligne ${row})`;
      const push = (field: ImportRowError['field'], value: unknown) =>
        errors.push({ row, word: label, field, value });

      if (!w.word) push('word', w.word);
      if (!w.meaning) push('meaning', w.meaning);
      if (!w.subject) push('subject', w.subject);
      if (!(VALID_LANGS as readonly string[]).includes(w.language_code)) {
        push('language_code', w.language_code);
      }
      if (!(VALID_TYPES as readonly string[]).includes(w.type)) push('type', w.type);
      if (w.level !== '' && !(VALID_LEVELS as readonly string[]).includes(w.level)) {
        push('level', w.level);
      }
      for (const [key, limit] of Object.entries(FIELD_MAX)) {
        const value = w[key as keyof ParsedWord];
        if (value.length > limit.max) push(limit.field, value.length);
      }
    });
    return errors;
  }

  formatValidationErrors(errors: ImportRowError[]): string {
    const grouped = new Map<ImportRowError['field'], number[]>();
    for (const e of errors) {
      grouped.set(e.field, [...(grouped.get(e.field) ?? []), e.row]);
    }

    const lines: string[] = [];
    for (const [field, rows] of grouped) {
      const info: { label: string; accepted?: readonly string[] } = FIELD_INFO[field];
      let line = `${info.label} (${rows.length}) : lignes ${rows.join(', ')}`;
      if (info.accepted) line += `\nAcceptés : ${info.accepted.join(', ')}`;
      lines.push(line);
    }
    return lines.join('\n');
  }
}
