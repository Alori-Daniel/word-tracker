import type { SQLiteDatabase } from 'expo-sqlite';

import {
  stableVaultSnapshot,
  type CloudCategoryRow,
  type CloudReviewRow,
  type CloudVaultSnapshot,
  type CloudWordRow,
} from '@/domain/cloud-vault';
import type { GuestIdentity } from '@/domain/vocabulary';

import type { CategoryRow, ReviewRow, WordRow } from '../database/rows';

export class LocalVaultChangedDuringSyncError extends Error {
  constructor() {
    super('The local vault changed while it was syncing.');
    this.name = 'LocalVaultChangedDuringSyncError';
  }
}

export class VaultSyncRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly identity: GuestIdentity,
  ) {}

  async createSnapshot(userId: string): Promise<CloudVaultSnapshot> {
    if (this.identity.linkedUserId !== userId) {
      throw new Error('The signed-in account does not own this local vault.');
    }

    const [categories, words, reviews] = await Promise.all([
      this.database.getAllAsync<CategoryRow>(
        `SELECT * FROM categories
         WHERE local_user_id = $localUserId
         ORDER BY id ASC`,
        { $localUserId: this.identity.localUserId },
      ),
      this.database.getAllAsync<WordRow>(
        `SELECT * FROM words
         WHERE local_user_id = $localUserId
         ORDER BY id ASC`,
        { $localUserId: this.identity.localUserId },
      ),
      this.database.getAllAsync<ReviewRow>(
        `SELECT * FROM reviews
         WHERE local_user_id = $localUserId
         ORDER BY id ASC`,
        { $localUserId: this.identity.localUserId },
      ),
    ]);

    return {
      categories: categories.map((row): CloudCategoryRow => ({
        id: row.id,
        user_id: userId,
        name: row.name,
        normalized_name: row.normalized_name,
        color: row.color,
        is_default: row.is_default === 1,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      })),
      words: words.map((row): CloudWordRow => ({
        id: row.id,
        user_id: userId,
        word: row.word,
        normalized_word: row.normalized_word,
        pronunciation: row.pronunciation,
        definition: row.definition,
        definition_provider_name: row.definition_provider_name,
        definition_provider_url: row.definition_provider_url,
        definition_source_url: row.definition_source_url,
        definition_license_name: row.definition_license_name,
        definition_license_url: row.definition_license_url,
        simple_definition: row.simple_definition,
        part_of_speech: row.part_of_speech,
        examples_json: row.examples_json,
        synonyms_json: row.synonyms_json,
        antonyms_json: row.antonyms_json,
        personal_notes: row.personal_notes,
        source: row.source,
        source_sentence: row.source_sentence,
        category_id: row.category_id,
        status: row.status,
        is_favorite: row.is_favorite === 1,
        next_review_at: row.next_review_at,
        revision: row.revision,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      })),
      reviews: reviews.map((row): CloudReviewRow => ({
        id: row.id,
        word_id: row.word_id,
        user_id: userId,
        response: row.response,
        reviewed_at: row.reviewed_at,
        scheduled_for: row.scheduled_for,
        next_review_at: row.next_review_at,
        interval_days: row.interval_days,
        ease_factor: row.ease_factor,
        created_at: row.created_at,
      })),
    };
  }

  async replaceIfUnchanged(
    expectedLocalSnapshot: CloudVaultSnapshot,
    cloudSnapshot: CloudVaultSnapshot,
  ): Promise<void> {
    const userId = this.identity.linkedUserId;
    if (!userId) {
      throw new Error('Sign in before applying a cloud snapshot.');
    }

    await this.database.withTransactionAsync(async () => {
      const current = await this.createSnapshot(userId);

      if (stableVaultSnapshot(current) !== stableVaultSnapshot(expectedLocalSnapshot)) {
        throw new LocalVaultChangedDuringSyncError();
      }

      await this.database.runAsync(
        'DELETE FROM reviews WHERE local_user_id = ?',
        this.identity.localUserId,
      );
      await this.database.runAsync(
        'DELETE FROM words WHERE local_user_id = ?',
        this.identity.localUserId,
      );
      await this.database.runAsync(
        'DELETE FROM categories WHERE local_user_id = ?',
        this.identity.localUserId,
      );

      for (const category of cloudSnapshot.categories) {
        await this.insertCategory(category);
      }

      for (const word of cloudSnapshot.words) {
        await this.insertWord(word);
      }

      for (const review of cloudSnapshot.reviews) {
        await this.insertReview(review);
      }
    });
  }

  private insertCategory(row: CloudCategoryRow): Promise<unknown> {
    return this.database.runAsync(
      `INSERT INTO categories (
         id, user_id, local_user_id, name, normalized_name, color, is_default,
         sync_status, created_at, updated_at, deleted_at
       ) VALUES (
         $id, $userId, $localUserId, $name, $normalizedName, $color, $isDefault,
         'synced', $createdAt, $updatedAt, $deletedAt
       )`,
      {
        $id: row.id,
        $userId: row.user_id,
        $localUserId: this.identity.localUserId,
        $name: row.name,
        $normalizedName: row.normalized_name,
        $color: row.color,
        $isDefault: row.is_default ? 1 : 0,
        $createdAt: row.created_at,
        $updatedAt: row.updated_at,
        $deletedAt: row.deleted_at,
      },
    );
  }

  private insertWord(row: CloudWordRow): Promise<unknown> {
    return this.database.runAsync(
      `INSERT INTO words (
         id, user_id, local_user_id, word, normalized_word, pronunciation, definition,
         definition_provider_name, definition_provider_url, definition_source_url,
         definition_license_name, definition_license_url, simple_definition, part_of_speech,
         examples_json, synonyms_json, antonyms_json, personal_notes, source, source_sentence,
         category_id, status, is_favorite, next_review_at, sync_status, revision,
         created_at, updated_at, deleted_at
       ) VALUES (
         $id, $userId, $localUserId, $word, $normalizedWord, $pronunciation, $definition,
         $definitionProviderName, $definitionProviderUrl, $definitionSourceUrl,
         $definitionLicenseName, $definitionLicenseUrl, $simpleDefinition, $partOfSpeech,
         $examplesJson, $synonymsJson, $antonymsJson, $personalNotes, $source, $sourceSentence,
         $categoryId, $status, $isFavorite, $nextReviewAt, 'synced', $revision,
         $createdAt, $updatedAt, $deletedAt
       )`,
      {
        $id: row.id,
        $userId: row.user_id,
        $localUserId: this.identity.localUserId,
        $word: row.word,
        $normalizedWord: row.normalized_word,
        $pronunciation: row.pronunciation,
        $definition: row.definition,
        $definitionProviderName: row.definition_provider_name,
        $definitionProviderUrl: row.definition_provider_url,
        $definitionSourceUrl: row.definition_source_url,
        $definitionLicenseName: row.definition_license_name,
        $definitionLicenseUrl: row.definition_license_url,
        $simpleDefinition: row.simple_definition,
        $partOfSpeech: row.part_of_speech,
        $examplesJson: row.examples_json,
        $synonymsJson: row.synonyms_json,
        $antonymsJson: row.antonyms_json,
        $personalNotes: row.personal_notes,
        $source: row.source,
        $sourceSentence: row.source_sentence,
        $categoryId: row.category_id,
        $status: row.status,
        $isFavorite: row.is_favorite ? 1 : 0,
        $nextReviewAt: row.next_review_at,
        $revision: row.revision,
        $createdAt: row.created_at,
        $updatedAt: row.updated_at,
        $deletedAt: row.deleted_at,
      },
    );
  }

  private insertReview(row: CloudReviewRow): Promise<unknown> {
    return this.database.runAsync(
      `INSERT INTO reviews (
         id, word_id, user_id, local_user_id, response, reviewed_at, scheduled_for,
         next_review_at, interval_days, ease_factor, created_at
       ) VALUES (
         $id, $wordId, $userId, $localUserId, $response, $reviewedAt, $scheduledFor,
         $nextReviewAt, $intervalDays, $easeFactor, $createdAt
       )`,
      {
        $id: row.id,
        $wordId: row.word_id,
        $userId: row.user_id,
        $localUserId: this.identity.localUserId,
        $response: row.response,
        $reviewedAt: row.reviewed_at,
        $scheduledFor: row.scheduled_for,
        $nextReviewAt: row.next_review_at,
        $intervalDays: row.interval_days,
        $easeFactor: row.ease_factor,
        $createdAt: row.created_at,
      },
    );
  }
}
