import type { SubscriptionStatus } from './account';

export type CloudCategoryRow = {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudWordRow = {
  id: string;
  user_id: string;
  word: string;
  normalized_word: string;
  pronunciation: string | null;
  definition: string;
  definition_provider_name: string | null;
  definition_provider_url: string | null;
  definition_source_url: string | null;
  definition_license_name: string | null;
  definition_license_url: string | null;
  simple_definition: string | null;
  part_of_speech: string | null;
  examples_json: string;
  synonyms_json: string;
  antonyms_json: string;
  personal_notes: string | null;
  source: string | null;
  source_sentence: string | null;
  category_id: string | null;
  status: string;
  is_favorite: boolean;
  next_review_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudReviewRow = {
  id: string;
  word_id: string;
  user_id: string;
  response: string;
  reviewed_at: string;
  scheduled_for: string | null;
  next_review_at: string | null;
  interval_days: number;
  ease_factor: number;
  created_at: string;
};

export type CloudVaultSnapshot = {
  categories: CloudCategoryRow[];
  words: CloudWordRow[];
  reviews: CloudReviewRow[];
};

export type CloudVaultProfile = {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionStatus: SubscriptionStatus;
};

export type CloudVaultSyncResult = {
  profile: CloudVaultProfile;
  snapshot: CloudVaultSnapshot;
};

export function stableVaultSnapshot(snapshot: CloudVaultSnapshot): string {
  return JSON.stringify({
    categories: [...snapshot.categories].sort((left, right) => left.id.localeCompare(right.id)),
    words: [...snapshot.words].sort((left, right) => left.id.localeCompare(right.id)),
    reviews: [...snapshot.reviews].sort((left, right) => left.id.localeCompare(right.id)),
  });
}
