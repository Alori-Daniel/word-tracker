export type LocalIdentityRow = {
  local_user_id: string;
  device_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  user_id: string | null;
  local_user_id: string | null;
  name: string;
  normalized_name: string;
  color: string;
  is_default: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type WordRow = {
  id: string;
  user_id: string | null;
  local_user_id: string | null;
  word: string;
  normalized_word: string;
  pronunciation: string | null;
  definition: string;
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
  is_favorite: number;
  next_review_at: string | null;
  sync_status: string;
  revision: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ReviewRow = {
  id: string;
  word_id: string;
  user_id: string | null;
  local_user_id: string | null;
  response: string;
  reviewed_at: string;
  scheduled_for: string | null;
  next_review_at: string | null;
  interval_days: number;
  ease_factor: number;
  created_at: string;
};

export type SettingRow = {
  setting_key: string;
  value_json: string;
  updated_at: string;
};
