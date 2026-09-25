import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  GuestIdentity,
  ReviewResponse,
  VocabularyReview,
} from '@/domain/vocabulary';

import type { ReviewRow } from '../database/rows';
import { mapReviewRow } from '../database/value-mappers';
import type { RepositoryDependencies } from './repository-dependencies';

export type RecordReviewInput = {
  wordId: string;
  response: ReviewResponse;
  scheduledFor?: string | null;
  nextReviewAt?: string | null;
  intervalDays?: number;
  easeFactor?: number;
};

export class ReviewRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly identity: GuestIdentity,
    private readonly dependencies: RepositoryDependencies,
  ) {}

  async listForWord(wordId: string): Promise<VocabularyReview[]> {
    const rows = await this.database.getAllAsync<ReviewRow>(
      `SELECT reviews.*
       FROM reviews
       INNER JOIN words ON words.id = reviews.word_id
       WHERE reviews.word_id = $wordId
         AND (
           words.local_user_id = $localUserId
           OR ($userId IS NOT NULL AND words.user_id = $userId)
         )
       ORDER BY reviews.reviewed_at DESC`,
      {
        $wordId: wordId,
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
      },
    );

    return rows.map(mapReviewRow);
  }

  async record(input: RecordReviewInput): Promise<VocabularyReview> {
    const id = this.dependencies.createId();
    const timestamp = this.dependencies.now();
    const intervalDays = Math.max(0, Math.floor(input.intervalDays ?? 0));
    const easeFactor = Math.max(0.1, input.easeFactor ?? 2.5);

    await this.database.withTransactionAsync(async () => {
      const insertResult = await this.database.runAsync(
        `INSERT INTO reviews (
           id, word_id, user_id, local_user_id, response, reviewed_at, scheduled_for,
           next_review_at, interval_days, ease_factor, created_at
         )
         SELECT
           $id, $wordId, $userId, $localUserId, $response, $reviewedAt, $scheduledFor,
           $nextReviewAt, $intervalDays, $easeFactor, $createdAt
         FROM words
         WHERE id = $wordId
           AND deleted_at IS NULL
           AND (
             local_user_id = $localUserId
             OR ($userId IS NOT NULL AND user_id = $userId)
           )`,
        {
          $id: id,
          $wordId: input.wordId,
          $userId: this.identity.linkedUserId,
          $localUserId: this.identity.localUserId,
          $response: input.response,
          $reviewedAt: timestamp,
          $scheduledFor: input.scheduledFor ?? null,
          $nextReviewAt: input.nextReviewAt ?? null,
          $intervalDays: intervalDays,
          $easeFactor: easeFactor,
          $createdAt: timestamp,
        },
      );

      if (insertResult.changes === 0) {
        throw new Error('The word to review could not be found.');
      }

      await this.database.runAsync(
        `UPDATE words SET
           next_review_at = $nextReviewAt,
           updated_at = $updatedAt,
           revision = revision + 1,
           sync_status = $syncStatus
         WHERE id = $wordId
           AND deleted_at IS NULL
           AND (
             local_user_id = $localUserId
             OR ($userId IS NOT NULL AND user_id = $userId)
           )`,
        {
          $nextReviewAt: input.nextReviewAt ?? null,
          $updatedAt: timestamp,
          $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
          $wordId: input.wordId,
          $localUserId: this.identity.localUserId,
          $userId: this.identity.linkedUserId,
        },
      );
    });

    const row = await this.database.getFirstAsync<ReviewRow>(
      'SELECT * FROM reviews WHERE id = ?',
      id,
    );
    if (!row) {
      throw new Error('The review was saved but could not be loaded.');
    }

    return mapReviewRow(row);
  }
}
