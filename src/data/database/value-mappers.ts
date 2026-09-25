import {
  LEARNING_STATUSES,
  REVIEW_RESPONSES,
  SYNC_STATUSES,
  type Category,
  type GuestIdentity,
  type LearningStatus,
  type ReviewResponse,
  type SyncStatus,
  type VocabularyReview,
  type VocabularyWord,
} from '@/domain/vocabulary';

import type { CategoryRow, LocalIdentityRow, ReviewRow, WordRow } from './rows';

export function normalizeLookupValue(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.normalize('NFKC').trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.normalize('NFKC').trim();
  return normalized || null;
}

export function normalizeStringList(values: readonly string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.normalize('NFKC').trim();
    const lookupValue = normalized.toLowerCase();

    if (normalized && !seen.has(lookupValue)) {
      seen.add(lookupValue);
      result.push(normalized);
    }
  }

  return result;
}

export function serializeStringList(values: readonly string[] | undefined): string {
  return JSON.stringify(normalizeStringList(values));
}

export function deserializeStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? normalizeStringList(parsed.filter((item): item is string => typeof item === 'string'))
      : [];
  } catch {
    return [];
  }
}

function toLearningStatus(value: string): LearningStatus {
  return LEARNING_STATUSES.includes(value as LearningStatus)
    ? (value as LearningStatus)
    : 'learning';
}

function toReviewResponse(value: string): ReviewResponse {
  return REVIEW_RESPONSES.includes(value as ReviewResponse)
    ? (value as ReviewResponse)
    : 'not_sure';
}

function toSyncStatus(value: string): SyncStatus {
  return SYNC_STATUSES.includes(value as SyncStatus) ? (value as SyncStatus) : 'local';
}

export function mapLocalIdentityRow(row: LocalIdentityRow): GuestIdentity {
  return {
    localUserId: row.local_user_id,
    deviceId: row.device_id,
    linkedUserId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    localUserId: row.local_user_id,
    name: row.name,
    color: row.color,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: toSyncStatus(row.sync_status),
  };
}

export function mapWordRow(row: WordRow): VocabularyWord {
  return {
    id: row.id,
    userId: row.user_id,
    localUserId: row.local_user_id,
    word: row.word,
    pronunciation: row.pronunciation,
    definition: row.definition,
    simpleDefinition: row.simple_definition,
    partOfSpeech: row.part_of_speech,
    examples: deserializeStringList(row.examples_json),
    synonyms: deserializeStringList(row.synonyms_json),
    antonyms: deserializeStringList(row.antonyms_json),
    personalNotes: row.personal_notes,
    source: row.source,
    sourceSentence: row.source_sentence,
    categoryId: row.category_id,
    status: toLearningStatus(row.status),
    isFavorite: row.is_favorite === 1,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: toSyncStatus(row.sync_status),
    revision: row.revision,
  };
}

export function mapReviewRow(row: ReviewRow): VocabularyReview {
  return {
    id: row.id,
    wordId: row.word_id,
    userId: row.user_id,
    localUserId: row.local_user_id,
    response: toReviewResponse(row.response),
    reviewedAt: row.reviewed_at,
    scheduledFor: row.scheduled_for,
    nextReviewAt: row.next_review_at,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    createdAt: row.created_at,
  };
}
