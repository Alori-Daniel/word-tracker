import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@/domain/account';
import type {
  CloudCategoryRow,
  CloudReviewRow,
  CloudVaultSyncResult,
  CloudWordRow,
} from '@/domain/cloud-vault';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string, maxLength = 4_000): string {
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  const normalized = value.normalize('NFKC').trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${field} is invalid.`);
  return normalized;
}

function nullableText(value: unknown, field: string, maxLength = 4_000): string | null {
  if (value === null) return null;
  return text(value, field, maxLength);
}

function numberValue(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a number.`);
  }
  return value;
}

function array(value: unknown, field: string, limit = 20_000): unknown[] {
  if (!Array.isArray(value) || value.length > limit) {
    throw new Error(`${field} must be an array.`);
  }
  return value;
}

function parseCategory(value: unknown, index: number): CloudCategoryRow {
  if (!isRecord(value)) throw new Error(`categories[${index}] must be an object.`);
  if (typeof value.is_default !== 'boolean') {
    throw new Error(`categories[${index}].is_default must be boolean.`);
  }

  return {
    id: text(value.id, `categories[${index}].id`, 120),
    user_id: text(value.user_id, `categories[${index}].user_id`, 120),
    name: text(value.name, `categories[${index}].name`, 120),
    normalized_name: text(value.normalized_name, `categories[${index}].normalized_name`, 120),
    color: text(value.color, `categories[${index}].color`, 40),
    is_default: value.is_default,
    created_at: text(value.created_at, `categories[${index}].created_at`, 80),
    updated_at: text(value.updated_at, `categories[${index}].updated_at`, 80),
    deleted_at: nullableText(value.deleted_at, `categories[${index}].deleted_at`, 80),
  };
}

function parseWord(value: unknown, index: number): CloudWordRow {
  if (!isRecord(value)) throw new Error(`words[${index}] must be an object.`);
  if (typeof value.is_favorite !== 'boolean') {
    throw new Error(`words[${index}].is_favorite must be boolean.`);
  }

  return {
    id: text(value.id, `words[${index}].id`, 120),
    user_id: text(value.user_id, `words[${index}].user_id`, 120),
    word: text(value.word, `words[${index}].word`, 120),
    normalized_word: text(value.normalized_word, `words[${index}].normalized_word`, 120),
    pronunciation: nullableText(value.pronunciation, `words[${index}].pronunciation`, 160),
    definition: typeof value.definition === 'string' ? value.definition : '',
    definition_provider_name: nullableText(value.definition_provider_name, `words[${index}].definition_provider_name`, 120),
    definition_provider_url: nullableText(value.definition_provider_url, `words[${index}].definition_provider_url`, 2_000),
    definition_source_url: nullableText(value.definition_source_url, `words[${index}].definition_source_url`, 2_000),
    definition_license_name: nullableText(value.definition_license_name, `words[${index}].definition_license_name`, 200),
    definition_license_url: nullableText(value.definition_license_url, `words[${index}].definition_license_url`, 2_000),
    simple_definition: nullableText(value.simple_definition, `words[${index}].simple_definition`, 3_000),
    part_of_speech: nullableText(value.part_of_speech, `words[${index}].part_of_speech`, 80),
    examples_json: text(value.examples_json, `words[${index}].examples_json`, 20_000),
    synonyms_json: text(value.synonyms_json, `words[${index}].synonyms_json`, 10_000),
    antonyms_json: text(value.antonyms_json, `words[${index}].antonyms_json`, 10_000),
    personal_notes: nullableText(value.personal_notes, `words[${index}].personal_notes`, 10_000),
    source: nullableText(value.source, `words[${index}].source`, 160),
    source_sentence: nullableText(value.source_sentence, `words[${index}].source_sentence`, 3_000),
    category_id: nullableText(value.category_id, `words[${index}].category_id`, 120),
    status: text(value.status, `words[${index}].status`, 20),
    is_favorite: value.is_favorite,
    next_review_at: nullableText(value.next_review_at, `words[${index}].next_review_at`, 80),
    revision: numberValue(value.revision, `words[${index}].revision`),
    created_at: text(value.created_at, `words[${index}].created_at`, 80),
    updated_at: text(value.updated_at, `words[${index}].updated_at`, 80),
    deleted_at: nullableText(value.deleted_at, `words[${index}].deleted_at`, 80),
  };
}

function parseReview(value: unknown, index: number): CloudReviewRow {
  if (!isRecord(value)) throw new Error(`reviews[${index}] must be an object.`);

  return {
    id: text(value.id, `reviews[${index}].id`, 120),
    word_id: text(value.word_id, `reviews[${index}].word_id`, 120),
    user_id: text(value.user_id, `reviews[${index}].user_id`, 120),
    response: text(value.response, `reviews[${index}].response`, 20),
    reviewed_at: text(value.reviewed_at, `reviews[${index}].reviewed_at`, 80),
    scheduled_for: nullableText(value.scheduled_for, `reviews[${index}].scheduled_for`, 80),
    next_review_at: nullableText(value.next_review_at, `reviews[${index}].next_review_at`, 80),
    interval_days: numberValue(value.interval_days, `reviews[${index}].interval_days`),
    ease_factor: numberValue(value.ease_factor, `reviews[${index}].ease_factor`),
    created_at: text(value.created_at, `reviews[${index}].created_at`, 80),
  };
}

export function parseCloudVaultSyncResult(value: unknown): CloudVaultSyncResult {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.snapshot)) {
    throw new Error('Cloud sync returned an invalid response.');
  }

  const subscription = text(value.profile.subscription_status, 'profile.subscription_status', 20);
  if (!SUBSCRIPTION_STATUSES.includes(subscription as SubscriptionStatus)) {
    throw new Error('Cloud sync returned an invalid subscription status.');
  }

  return {
    profile: {
      userId: text(value.profile.id, 'profile.id', 120),
      email: text(value.profile.email, 'profile.email', 320),
      displayName: nullableText(value.profile.display_name, 'profile.display_name', 200),
      avatarUrl: nullableText(value.profile.avatar_url, 'profile.avatar_url', 2_000),
      subscriptionStatus: subscription as SubscriptionStatus,
    },
    snapshot: {
      categories: array(value.snapshot.categories, 'snapshot.categories').map(parseCategory),
      words: array(value.snapshot.words, 'snapshot.words').map(parseWord),
      reviews: array(value.snapshot.reviews, 'snapshot.reviews').map(parseReview),
    },
  };
}
