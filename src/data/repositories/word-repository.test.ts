import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import type { WordRow } from '../database/rows';
import { DuplicateWordError, WordRepository } from './word-repository';

const identity: GuestIdentity = {
  localUserId: 'guest-1',
  deviceId: 'device-1',
  linkedUserId: null,
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
};

const wordRow: WordRow = {
  id: 'word-1',
  user_id: null,
  local_user_id: 'guest-1',
  word: 'Ephemeral',
  normalized_word: 'ephemeral',
  pronunciation: null,
  definition: 'Lasting a short time.',
  definition_provider_name: null,
  definition_provider_url: null,
  definition_source_url: null,
  definition_license_name: null,
  definition_license_url: null,
  simple_definition: 'Brief.',
  part_of_speech: 'adjective',
  examples_json: '["A brief moment."]',
  synonyms_json: '["fleeting"]',
  antonyms_json: '["lasting"]',
  personal_notes: null,
  source: null,
  source_sentence: null,
  category_id: null,
  status: 'learning',
  is_favorite: 0,
  next_review_at: null,
  sync_status: 'local',
  revision: 1,
  created_at: '2026-09-25T00:00:00.000Z',
  updated_at: '2026-09-25T00:00:00.000Z',
  deleted_at: null,
};

function createRepository(database: SQLiteDatabase) {
  return new WordRepository(database, identity, {
    createId: () => 'word-1',
    now: () => '2026-09-25T00:00:00.000Z',
  });
}

describe('WordRepository', () => {
  it('creates a normalized guest-owned word using bound parameters', async () => {
    const getFirstAsync = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(wordRow);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const repository = createRepository({ getFirstAsync, runAsync } as unknown as SQLiteDatabase);

    await expect(
      repository.create({
        word: '  Ephemeral  ',
        definition: '  Lasting a short time.  ',
        definitionAttribution: {
          providerName: 'Free Dictionary API',
          providerUrl: 'https://dictionaryapi.dev/',
          sourceUrl: null,
          licenseName: null,
          licenseUrl: null,
        },
        synonyms: [' fleeting ', 'Fleeting'],
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'word-1', word: 'Ephemeral' }));

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO words'),
      expect.objectContaining({
        $localUserId: 'guest-1',
        $normalizedWord: 'ephemeral',
        $definitionProviderName: 'Free Dictionary API',
        $definitionProviderUrl: 'https://dictionaryapi.dev/',
        $synonymsJson: '["fleeting"]',
        $word: 'Ephemeral',
      }),
    );
  });

  it('rejects a duplicate before attempting an insert', async () => {
    const runAsync = jest.fn();
    const database = {
      getFirstAsync: jest.fn(async () => wordRow),
      runAsync,
    } as unknown as SQLiteDatabase;

    await expect(createRepository(database).create({ word: 'EPHEMERAL' })).rejects.toBeInstanceOf(
      DuplicateWordError,
    );
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('binds search and filters and maps stored list values', async () => {
    const getAllAsync = jest.fn(async () => [wordRow]);
    const repository = createRepository({ getAllAsync } as unknown as SQLiteDatabase);

    await expect(
      repository.list({ query: ' Ephem ', status: 'learning', categoryId: 'category-1' }),
    ).resolves.toEqual([
      expect.objectContaining({
        examples: ['A brief moment.'],
        synonyms: ['fleeting'],
        word: 'Ephemeral',
      }),
    ]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('words.normalized_word LIKE $queryPattern'),
      expect.objectContaining({
        $categoryId: 'category-1',
        $query: 'ephem',
        $queryPattern: '%ephem%',
        $status: 'learning',
      }),
    );
  });

  it('updates editable fields while preserving guest ownership', async () => {
    const updatedRow: WordRow = {
      ...wordRow,
      definition: 'Existing for a very short time.',
      examples_json: '["A short-lived trend."]',
      is_favorite: 1,
      revision: 2,
      status: 'familiar',
    };
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce(wordRow)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(updatedRow);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const repository = createRepository({ getFirstAsync, runAsync } as unknown as SQLiteDatabase);

    await expect(
      repository.update('word-1', {
        definition: ' Existing for a very short time. ',
        examples: [' A short-lived trend. '],
        isFavorite: true,
        status: 'familiar',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        definition: 'Existing for a very short time.',
        isFavorite: true,
        revision: 2,
        status: 'familiar',
      }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('revision = revision + 1'),
      expect.objectContaining({
        $definition: 'Existing for a very short time.',
        $examplesJson: '["A short-lived trend."]',
        $id: 'word-1',
        $isFavorite: 1,
        $localUserId: 'guest-1',
        $status: 'familiar',
      }),
    );
  });

  it('soft deletes only an owned active word', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const repository = createRepository({ runAsync } as unknown as SQLiteDatabase);

    await expect(repository.softDelete('word-1')).resolves.toBe(true);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at = $timestamp'),
      expect.objectContaining({ $id: 'word-1', $localUserId: 'guest-1' }),
    );
  });
});
