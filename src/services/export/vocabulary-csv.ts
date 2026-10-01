import type { Category, VocabularyWord } from '@/domain/vocabulary';

const CSV_HEADERS = [
  'word',
  'meaning',
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
] as const;

export function createVocabularyCsv(
  words: readonly VocabularyWord[],
  categories: readonly Category[],
): string {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const rows = words.map((word) => [
    word.word,
    word.definition,
    word.simpleDefinition ?? '',
    word.partOfSpeech ?? '',
    word.pronunciation ?? '',
    word.examples.join(' | '),
    word.synonyms.join(' | '),
    word.antonyms.join(' | '),
    word.categoryId ? (categoryNames.get(word.categoryId) ?? '') : '',
    word.status,
    word.isFavorite ? 'true' : 'false',
    word.personalNotes ?? '',
    word.source ?? '',
    word.sourceSentence ?? '',
    word.createdAt,
    word.updatedAt,
  ]);

  return `\uFEFF${[CSV_HEADERS, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}\r\n`;
}

function csvCell(value: string): string {
  const spreadsheetSafeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${spreadsheetSafeValue.replaceAll('"', '""')}"`;
}
