import { BadRequestException, Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { VALID_LANGS, VALID_LEVELS, VALID_TYPES } from '@sealvo/shared';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';

export const MAX_IMPORT_ROWS = 500;

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
} as const satisfies Record<string, { label: string; accepted?: readonly string[] }>;

const DB_LEVEL_TO_ENUM: Record<string, CreateWordDto['level']> = {
  x: 'x',
  '0': 'level_0',
  '1': 'level_1',
  '2': 'level_2',
  v: 'v',
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
      type: type === 'ph.v' ? 'ph_v' : type,
      level: level === '' ? undefined : DB_LEVEL_TO_ENUM[level],
    }));
  }

  parseExcelBuffer(buffer: Buffer): ParsedWord[] {
    // Header + limit + 1 extra row, so an oversized file is detected without parsing all of it
    const workbook = xlsx.read(buffer, { type: 'buffer', sheetRows: MAX_IMPORT_ROWS + 2 });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = worksheet ? xlsx.utils.sheet_to_json<Cell[]>(worksheet, { header: 1 }) : [];

    if (!data.length) return [];

    const startRow = data[0]?.[0] === 'Mot' || data[0]?.[0] === 'Word' ? 1 : 0;
    if (data.length - startRow > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Le fichier dépasse la limite de ${MAX_IMPORT_ROWS} mots par import.`,
      );
    }

    const words: ParsedWord[] = [];
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || cell(row[0]) === '') continue;

      words.push({
        word: cell(row[0]),
        language_code: cell(row[1]).replace(/\([^)]*\)/g, '').trim(),
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

    return words;
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
