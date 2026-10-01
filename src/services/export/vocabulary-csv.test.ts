import type { Category, VocabularyWord } from '@/domain/vocabulary';

import { createVocabularyCsv } from './vocabulary-csv';

const category = {
  id: 'category-1',
  name: 'Reading',
} as Category;

const word = {
  word: 'Ephemeral',
  definition: 'Lasting a short time, or "brief".',
  simpleDefinition: 'Short-lived',
  partOfSpeech: 'adjective',
  pronunciation: null,
  examples: ['Fame can be ephemeral.'],
  synonyms: ['brief', 'fleeting'],
  antonyms: ['lasting'],
  categoryId: 'category-1',
  status: 'learning',
  isFavorite: true,
  personalNotes: '=unsafe formula',
  source: 'Novel',
  sourceSentence: null,
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
} as VocabularyWord;

describe('createVocabularyCsv', () => {
  it('exports vocabulary with categories, escaped quotes, and spreadsheet-safe cells', () => {
    const csv = createVocabularyCsv([word], [category]);

    expect(csv.startsWith('\uFEFF"word","meaning"')).toBe(true);
    expect(csv).toContain('"Lasting a short time, or ""brief""."');
    expect(csv).toContain('"Reading"');
    expect(csv).toContain('"\'=unsafe formula"');
    expect(csv).toContain('"brief | fleeting"');
  });
});
