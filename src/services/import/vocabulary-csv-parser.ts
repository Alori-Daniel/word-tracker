import type { CsvImportPreview, CsvWordImportRecord } from '@/domain/csv-import';
import { LEARNING_STATUSES, type LearningStatus } from '@/domain/vocabulary';

const MAX_IMPORT_ROWS = 5_000;
const ARRAY_SEPARATOR = '|';
const ACCEPTED_HEADERS = new Set([
  'word',
  'meaning',
  'definition',
  'simple_meaning',
  'part_of_speech',
  'pronunciation',
  'examples',
  'synonyms',
  'antonyms',
  'category',
  'learning_status',
  'favorite',
  'notes',
  'source',
  'source_sentence',
  'created_at',
  'updated_at',
]);

export class InvalidCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCsvError';
  }
}

export function parseVocabularyCsv(csv: string): CsvImportPreview {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ''));
  if (rows.length === 0 || rows.every(isEmptyRow)) {
    throw new InvalidCsvError('The CSV file is empty.');
  }

  const headerRowIndex = rows.findIndex((row) => !isEmptyRow(row));
  const rawHeaders = rows[headerRowIndex] ?? [];
  const headers = rawHeaders.map(normalizeHeader);
  const duplicateHeader = headers.find((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeader) throw new InvalidCsvError(`The “${duplicateHeader}” column appears more than once.`);

  if (!headers.includes('word')) throw new InvalidCsvError('Add a required “word” column.');
  if (!headers.includes('meaning') && !headers.includes('definition')) {
    throw new InvalidCsvError('Add a required “meaning” column.');
  }

  const unknownHeaders = headers.filter((header) => header && !ACCEPTED_HEADERS.has(header));
  if (unknownHeaders.length > 0) {
    throw new InvalidCsvError(`Unknown column${unknownHeaders.length === 1 ? '' : 's'}: ${unknownHeaders.join(', ')}.`);
  }

  const dataRows = rows.slice(headerRowIndex + 1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new InvalidCsvError(`A CSV can contain at most ${MAX_IMPORT_ROWS.toLocaleString()} rows.`);
  }

  const records: CsvWordImportRecord[] = [];
  const issues: CsvImportPreview['issues'] = [];
  const duplicateRows: number[] = [];
  const seenWords = new Set<string>();
  let ignoredEmptyRows = 0;

  dataRows.forEach((cells, index) => {
    const rowNumber = headerRowIndex + index + 2;
    if (isEmptyRow(cells)) {
      ignoredEmptyRows += 1;
      return;
    }
    if (cells.length > headers.length && cells.slice(headers.length).some((cell) => cell.trim())) {
      issues.push({ rowNumber, message: 'This row has more values than the header.' });
      return;
    }

    const value = (header: string) => {
      const column = headers.indexOf(header);
      return column < 0 ? '' : (cells[column] ?? '').normalize('NFKC').trim();
    };
    const word = value('word');
    const definition = value('meaning') || value('definition');

    if (!word) issues.push({ rowNumber, message: 'Word is required.' });
    if (!definition) issues.push({ rowNumber, message: 'Meaning is required.' });
    if (!word || !definition) return;

    const normalizedWord = word.toLocaleLowerCase();
    if (seenWords.has(normalizedWord)) {
      duplicateRows.push(rowNumber);
      return;
    }
    seenWords.add(normalizedWord);

    const rawStatus = value('learning_status').toLocaleLowerCase();
    if (rawStatus && !LEARNING_STATUSES.includes(rawStatus as LearningStatus)) {
      issues.push({
        rowNumber,
        message: 'Learning status must be learning, familiar, or mastered.',
      });
      return;
    }

    const rawFavorite = value('favorite').toLocaleLowerCase();
    const favorite = parseBoolean(rawFavorite);
    if (rawFavorite && favorite === null) {
      issues.push({ rowNumber, message: 'Favorite must be true or false.' });
      return;
    }

    records.push({
      categoryName: optional(value('category')),
      rowNumber,
      input: {
        word,
        definition,
        simpleDefinition: optional(value('simple_meaning')),
        partOfSpeech: optional(value('part_of_speech')),
        pronunciation: optional(value('pronunciation')),
        examples: list(value('examples')),
        synonyms: list(value('synonyms')),
        antonyms: list(value('antonyms')),
        status: (rawStatus || 'learning') as LearningStatus,
        isFavorite: favorite ?? false,
        personalNotes: optional(value('notes')),
        source: optional(value('source')),
        sourceSentence: optional(value('source_sentence')),
      },
    });
  });

  return {
    duplicateRows,
    ignoredEmptyRows,
    issues,
    records,
    totalDataRows: dataRows.filter((row) => !isEmptyRow(row)).length,
  };
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      if (cell.length > 0) throw new InvalidCsvError('A quoted value begins in an unexpected place.');
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new InvalidCsvError('A quoted value is not closed.');
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase().replaceAll(' ', '_');
}

function isEmptyRow(row: readonly string[]): boolean {
  return row.every((cell) => !cell.trim());
}

function optional(value: string): string | null {
  return value || null;
}

function list(value: string): string[] {
  return value
    .split(ARRAY_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string): boolean | null {
  if (!value) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}
