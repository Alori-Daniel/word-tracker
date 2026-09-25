import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import type { ReviewHistoryRow, ReviewRow, WordRow } from '../database/rows';
import { ReviewRepository } from './review-repository';

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
  examples_json: '[]',
  synonyms_json: '[]',
  antonyms_json: '[]',
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

const reviewRow: ReviewRow = {
  id: 'review-1',
  word_id: 'word-1',
  user_id: null,
  local_user_id: 'guest-1',
  response: 'know',
  reviewed_at: '2026-09-25T12:00:00.000Z',
  scheduled_for: null,
  next_review_at: '2026-09-28T12:00:00.000Z',
  interval_days: 3,
  ease_factor: 2.6,
  created_at: '2026-09-25T12:00:00.000Z',
};

function createRepository(database: SQLiteDatabase) {
  return new ReviewRepository(database, identity, {
    createId: () => 'review-1',
    now: () => '2026-09-25T12:00:00.000Z',
  });
}

describe('ReviewRepository', () => {
  it('loads a bounded queue of due and unscheduled words', async () => {
    const getAllAsync = jest.fn(async () => [wordRow]);
    const repository = createRepository({ getAllAsync } as unknown as SQLiteDatabase);

    await expect(
      repository.listDue({ now: '2026-09-25T12:00:00.000Z', limit: 500 }),
    ).resolves.toEqual([expect.objectContaining({ id: 'word-1', word: 'Ephemeral' })]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('next_review_at IS NULL OR next_review_at <= $now'),
      expect.objectContaining({
        $limit: 200,
        $localUserId: 'guest-1',
        $now: '2026-09-25T12:00:00.000Z',
      }),
    );
  });

  it('records a response and updates the word schedule and status atomically', async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce({ changes: 1, lastInsertRowId: 1 })
      .mockResolvedValueOnce({ changes: 1, lastInsertRowId: 0 });
    const database = {
      getFirstAsync: jest.fn(async () => reviewRow),
      runAsync,
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    } as unknown as SQLiteDatabase;

    await expect(
      createRepository(database).record({
        wordId: 'word-1',
        response: 'know',
        nextReviewAt: '2026-09-28T12:00:00.000Z',
        intervalDays: 3,
        easeFactor: 2.6,
        status: 'learning',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'review-1', intervalDays: 3, response: 'know' }),
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('status = $status'),
      expect.objectContaining({
        $nextReviewAt: '2026-09-28T12:00:00.000Z',
        $status: 'learning',
        $wordId: 'word-1',
      }),
    );
  });

  it('does not create a review for a missing or unowned word', async () => {
    const runAsync = jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 }));
    const database = {
      runAsync,
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    } as unknown as SQLiteDatabase;

    await expect(
      createRepository(database).record({
        wordId: 'missing',
        response: 'forgot',
        status: 'learning',
      }),
    ).rejects.toThrow('The word to review could not be found.');
    expect(runAsync).toHaveBeenCalledTimes(1);
  });

  it('returns recent review history with its word label', async () => {
    const historyRow: ReviewHistoryRow = { ...reviewRow, word: 'Ephemeral' };
    const getAllAsync = jest.fn(async () => [historyRow]);
    const repository = createRepository({ getAllAsync } as unknown as SQLiteDatabase);

    await expect(repository.listRecent(5)).resolves.toEqual([
      expect.objectContaining({ id: 'review-1', word: 'Ephemeral' }),
    ]);
  });
});
