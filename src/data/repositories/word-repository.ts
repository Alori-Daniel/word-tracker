import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateWordInput,
  GuestIdentity,
  UpdateWordInput,
  VocabularyWord,
  WordListOptions,
} from '@/domain/vocabulary';
import type { DictionaryAttribution } from '@/domain/dictionary';

import type { WordRow } from '../database/rows';
import {
  mapWordRow,
  normalizeLookupValue,
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeStringList,
  serializeStringList,
} from '../database/value-mappers';
import type { RepositoryDependencies } from './repository-dependencies';

export class DuplicateWordError extends Error {
  constructor(word: string) {
    super(`“${word}” is already in this vocabulary vault.`);
    this.name = 'DuplicateWordError';
  }
}

function attributionParameters(attribution: DictionaryAttribution | null | undefined) {
  return {
    providerName: normalizeOptionalText(attribution?.providerName),
    providerUrl: normalizeOptionalText(attribution?.providerUrl),
    sourceUrl: normalizeOptionalText(attribution?.sourceUrl),
    licenseName: normalizeOptionalText(attribution?.licenseName),
    licenseUrl: normalizeOptionalText(attribution?.licenseUrl),
  };
}

export class WordRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly identity: GuestIdentity,
    private readonly dependencies: RepositoryDependencies,
  ) {}

  async list(options: WordListOptions = {}): Promise<VocabularyWord[]> {
    const query = options.query ? normalizeLookupValue(options.query) : null;
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT words.*
       FROM words
       LEFT JOIN categories ON categories.id = words.category_id AND categories.deleted_at IS NULL
       WHERE words.deleted_at IS NULL
         AND (
           words.local_user_id = $localUserId
           OR ($userId IS NOT NULL AND words.user_id = $userId)
         )
         AND ($status IS NULL OR words.status = $status)
         AND ($categoryId IS NULL OR words.category_id = $categoryId)
         AND (
           $query IS NULL
           OR words.normalized_word LIKE $queryPattern
           OR lower(words.definition) LIKE $queryPattern
           OR lower(coalesce(words.simple_definition, '')) LIKE $queryPattern
           OR lower(coalesce(words.personal_notes, '')) LIKE $queryPattern
           OR categories.normalized_name LIKE $queryPattern
         )
       ORDER BY words.created_at DESC
       LIMIT $limit OFFSET $offset`,
      {
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
        $status: options.status ?? null,
        $categoryId: options.categoryId ?? null,
        $query: query,
        $queryPattern: query ? `%${query}%` : null,
        $limit: limit,
        $offset: offset,
      },
    );

    return rows.map(mapWordRow);
  }

  async getById(id: string): Promise<VocabularyWord | null> {
    const row = await this.getOwnedRow(id);
    return row ? mapWordRow(row) : null;
  }

  async count(): Promise<number> {
    const row = await this.database.getFirstAsync<{ count: number }>(
      `SELECT count(*) AS count
       FROM words
       WHERE deleted_at IS NULL
         AND (
           local_user_id = $localUserId
           OR ($userId IS NOT NULL AND user_id = $userId)
         )`,
      {
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
      },
    );

    return row?.count ?? 0;
  }

  async create(input: CreateWordInput): Promise<VocabularyWord> {
    const word = normalizeRequiredText(input.word, 'Word');
    const normalizedWord = normalizeLookupValue(word);

    if (await this.findActiveByNormalizedWord(normalizedWord)) {
      throw new DuplicateWordError(word);
    }

    const id = this.dependencies.createId();
    const timestamp = this.dependencies.now();
    const definitionAttribution = attributionParameters(input.definitionAttribution);

    await this.database.runAsync(
      `INSERT INTO words (
         id, user_id, local_user_id, word, normalized_word, pronunciation, definition,
         definition_provider_name, definition_provider_url, definition_source_url,
         definition_license_name,
         definition_license_url,
         simple_definition, part_of_speech, examples_json, synonyms_json, antonyms_json,
         personal_notes, source, source_sentence, category_id, status, is_favorite,
         next_review_at, sync_status, revision, created_at, updated_at, deleted_at
       ) VALUES (
         $id, $userId, $localUserId, $word, $normalizedWord, $pronunciation, $definition,
         $definitionProviderName, $definitionProviderUrl, $definitionSourceUrl,
         $definitionLicenseName,
         $definitionLicenseUrl,
         $simpleDefinition, $partOfSpeech, $examplesJson, $synonymsJson, $antonymsJson,
         $personalNotes, $source, $sourceSentence, $categoryId, $status, $isFavorite,
         $nextReviewAt, $syncStatus, 1, $createdAt, $updatedAt, NULL
       )`,
      {
        $id: id,
        $userId: this.identity.linkedUserId,
        $localUserId: this.identity.localUserId,
        $word: word,
        $normalizedWord: normalizedWord,
        $pronunciation: normalizeOptionalText(input.pronunciation),
        $definition: input.definition?.normalize('NFKC').trim() ?? '',
        $definitionProviderName: definitionAttribution.providerName,
        $definitionProviderUrl: definitionAttribution.providerUrl,
        $definitionSourceUrl: definitionAttribution.sourceUrl,
        $definitionLicenseName: definitionAttribution.licenseName,
        $definitionLicenseUrl: definitionAttribution.licenseUrl,
        $simpleDefinition: normalizeOptionalText(input.simpleDefinition),
        $partOfSpeech: normalizeOptionalText(input.partOfSpeech),
        $examplesJson: serializeStringList(input.examples),
        $synonymsJson: serializeStringList(input.synonyms),
        $antonymsJson: serializeStringList(input.antonyms),
        $personalNotes: normalizeOptionalText(input.personalNotes),
        $source: normalizeOptionalText(input.source),
        $sourceSentence: normalizeOptionalText(input.sourceSentence),
        $categoryId: input.categoryId ?? null,
        $status: input.status ?? 'learning',
        $isFavorite: input.isFavorite ? 1 : 0,
        $nextReviewAt: input.nextReviewAt ?? null,
        $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
        $createdAt: timestamp,
        $updatedAt: timestamp,
      },
    );

    const createdWord = await this.getById(id);
    if (!createdWord) {
      throw new Error('The word was saved but could not be loaded.');
    }

    return createdWord;
  }

  async update(id: string, input: UpdateWordInput): Promise<VocabularyWord | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const word =
      input.word === undefined ? existing.word : normalizeRequiredText(input.word, 'Word');
    const normalizedWord = normalizeLookupValue(word);
    const duplicate = await this.findActiveByNormalizedWord(normalizedWord);

    if (duplicate && duplicate.id !== id) {
      throw new DuplicateWordError(word);
    }

    const timestamp = this.dependencies.now();
    const definitionAttribution = attributionParameters(
      input.definitionAttribution === undefined
        ? existing.definitionAttribution
        : input.definitionAttribution,
    );

    await this.database.runAsync(
      `UPDATE words SET
         word = $word,
         normalized_word = $normalizedWord,
         pronunciation = $pronunciation,
         definition = $definition,
         definition_provider_name = $definitionProviderName,
         definition_provider_url = $definitionProviderUrl,
         definition_source_url = $definitionSourceUrl,
         definition_license_name = $definitionLicenseName,
         definition_license_url = $definitionLicenseUrl,
         simple_definition = $simpleDefinition,
         part_of_speech = $partOfSpeech,
         examples_json = $examplesJson,
         synonyms_json = $synonymsJson,
         antonyms_json = $antonymsJson,
         personal_notes = $personalNotes,
         source = $source,
         source_sentence = $sourceSentence,
         category_id = $categoryId,
         status = $status,
         is_favorite = $isFavorite,
         next_review_at = $nextReviewAt,
         sync_status = $syncStatus,
         revision = revision + 1,
         updated_at = $updatedAt
       WHERE id = $id
         AND deleted_at IS NULL
         AND (
           local_user_id = $localUserId
           OR ($userId IS NOT NULL AND user_id = $userId)
         )`,
      {
        $word: word,
        $normalizedWord: normalizedWord,
        $pronunciation:
          input.pronunciation === undefined
            ? existing.pronunciation
            : normalizeOptionalText(input.pronunciation),
        $definition:
          input.definition === undefined
            ? existing.definition
            : input.definition.normalize('NFKC').trim(),
        $definitionProviderName: definitionAttribution.providerName,
        $definitionProviderUrl: definitionAttribution.providerUrl,
        $definitionSourceUrl: definitionAttribution.sourceUrl,
        $definitionLicenseName: definitionAttribution.licenseName,
        $definitionLicenseUrl: definitionAttribution.licenseUrl,
        $simpleDefinition:
          input.simpleDefinition === undefined
            ? existing.simpleDefinition
            : normalizeOptionalText(input.simpleDefinition),
        $partOfSpeech:
          input.partOfSpeech === undefined
            ? existing.partOfSpeech
            : normalizeOptionalText(input.partOfSpeech),
        $examplesJson: JSON.stringify(
          input.examples === undefined ? existing.examples : normalizeStringList(input.examples),
        ),
        $synonymsJson: JSON.stringify(
          input.synonyms === undefined ? existing.synonyms : normalizeStringList(input.synonyms),
        ),
        $antonymsJson: JSON.stringify(
          input.antonyms === undefined ? existing.antonyms : normalizeStringList(input.antonyms),
        ),
        $personalNotes:
          input.personalNotes === undefined
            ? existing.personalNotes
            : normalizeOptionalText(input.personalNotes),
        $source:
          input.source === undefined ? existing.source : normalizeOptionalText(input.source),
        $sourceSentence:
          input.sourceSentence === undefined
            ? existing.sourceSentence
            : normalizeOptionalText(input.sourceSentence),
        $categoryId: input.categoryId === undefined ? existing.categoryId : input.categoryId,
        $status: input.status ?? existing.status,
        $isFavorite: (input.isFavorite ?? existing.isFavorite) ? 1 : 0,
        $nextReviewAt:
          input.nextReviewAt === undefined ? existing.nextReviewAt : input.nextReviewAt,
        $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
        $updatedAt: timestamp,
        $id: id,
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
      },
    );

    return this.getById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const timestamp = this.dependencies.now();
    const result = await this.database.runAsync(
      `UPDATE words SET
         deleted_at = $timestamp,
         updated_at = $timestamp,
         sync_status = $syncStatus,
         revision = revision + 1
       WHERE id = $id
         AND deleted_at IS NULL
         AND (
           local_user_id = $localUserId
           OR ($userId IS NOT NULL AND user_id = $userId)
         )`,
      {
        $timestamp: timestamp,
        $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
        $id: id,
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
      },
    );

    return result.changes > 0;
  }

  private getOwnedRow(id: string): Promise<WordRow | null> {
    return this.database.getFirstAsync<WordRow>(
      `SELECT *
       FROM words
       WHERE id = $id
         AND deleted_at IS NULL
         AND (
           local_user_id = $localUserId
           OR ($userId IS NOT NULL AND user_id = $userId)
         )`,
      {
        $id: id,
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
      },
    );
  }

  private findActiveByNormalizedWord(normalizedWord: string): Promise<WordRow | null> {
    return this.database.getFirstAsync<WordRow>(
      `SELECT *
       FROM words
       WHERE normalized_word = $normalizedWord
         AND deleted_at IS NULL
         AND (
           local_user_id = $localUserId
           OR ($userId IS NOT NULL AND user_id = $userId)
         )
       LIMIT 1`,
      {
        $normalizedWord: normalizedWord,
        $localUserId: this.identity.localUserId,
        $userId: this.identity.linkedUserId,
      },
    );
  }
}
