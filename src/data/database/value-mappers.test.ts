import type { WordRow } from './rows';
import {
  deserializeStringList,
  mapWordRow,
  normalizeLookupValue,
  normalizeRequiredText,
  normalizeStringList,
} from './value-mappers';

const baseWordRow: WordRow = {
  id: 'word-id',
  user_id: null,
  local_user_id: 'local-user-id',
  word: 'Ephemeral',
  normalized_word: 'ephemeral',
  pronunciation: '/ɪˈfɛm(ə)rəl/',
  definition: 'Lasting for a very short time.',
  simple_definition: 'Short-lived.',
  part_of_speech: 'adjective',
  examples_json: '["A brief moment"]',
  synonyms_json: '["fleeting"]',
  antonyms_json: '["permanent"]',
  personal_notes: null,
  source: 'Book',
  source_sentence: null,
  category_id: null,
  status: 'learning',
  is_favorite: 1,
  next_review_at: null,
  sync_status: 'local',
  revision: 1,
  created_at: '2026-09-25T00:00:00.000Z',
  updated_at: '2026-09-25T00:00:00.000Z',
  deleted_at: null,
};

describe('database value mappers', () => {
  it('normalizes lookup values consistently', () => {
    expect(normalizeLookupValue('  EPHEMERAL  ')).toBe('ephemeral');
    expect(() => normalizeRequiredText('   ', 'Word')).toThrow('Word is required.');
  });

  it('cleans and de-duplicates string lists', () => {
    expect(normalizeStringList([' fleeting ', 'Fleeting', '', 'brief'])).toEqual([
      'fleeting',
      'brief',
    ]);
  });

  it('recovers safely from malformed stored JSON', () => {
    expect(deserializeStringList('{not-json')).toEqual([]);
    expect(deserializeStringList('["valid", 42, null]')).toEqual(['valid']);
  });

  it('maps SQLite primitives into the vocabulary domain model', () => {
    const word = mapWordRow(baseWordRow);

    expect(word).toMatchObject({
      id: 'word-id',
      word: 'Ephemeral',
      examples: ['A brief moment'],
      isFavorite: true,
      status: 'learning',
    });
  });
});
