export type DatabaseMigration = {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
};

const createInitialSchema: DatabaseMigration = {
  version: 1,
  name: 'create_initial_local_schema',
  sql: `
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'email')),
      provider_account_id TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'free'
        CHECK (subscription_status IN ('free', 'trialing', 'premium', 'expired')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX users_provider_account_unique
      ON users(provider, provider_account_id)
      WHERE provider_account_id IS NOT NULL;

    CREATE UNIQUE INDEX users_email_provider_unique
      ON users(email COLLATE NOCASE, provider);

    CREATE TABLE local_identity (
      singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
      local_user_id TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE categories (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      local_user_id TEXT REFERENCES local_identity(local_user_id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      normalized_name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      sync_status TEXT NOT NULL DEFAULT 'local'
        CHECK (sync_status IN ('local', 'pending', 'synced', 'error')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      CHECK (user_id IS NOT NULL OR local_user_id IS NOT NULL)
    );

    CREATE UNIQUE INDEX categories_local_name_unique
      ON categories(local_user_id, normalized_name)
      WHERE local_user_id IS NOT NULL AND deleted_at IS NULL;

    CREATE UNIQUE INDEX categories_user_name_unique
      ON categories(user_id, normalized_name)
      WHERE user_id IS NOT NULL AND deleted_at IS NULL;

    CREATE INDEX categories_local_active_index
      ON categories(local_user_id, deleted_at, name);

    CREATE TABLE words (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      local_user_id TEXT REFERENCES local_identity(local_user_id) ON DELETE CASCADE,
      word TEXT NOT NULL CHECK (length(trim(word)) > 0),
      normalized_word TEXT NOT NULL,
      pronunciation TEXT,
      definition TEXT NOT NULL DEFAULT '',
      simple_definition TEXT,
      part_of_speech TEXT,
      examples_json TEXT NOT NULL DEFAULT '[]',
      synonyms_json TEXT NOT NULL DEFAULT '[]',
      antonyms_json TEXT NOT NULL DEFAULT '[]',
      personal_notes TEXT,
      source TEXT,
      source_sentence TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'learning'
        CHECK (status IN ('learning', 'familiar', 'mastered')),
      is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
      next_review_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local'
        CHECK (sync_status IN ('local', 'pending', 'synced', 'error')),
      revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      CHECK (user_id IS NOT NULL OR local_user_id IS NOT NULL)
    );

    CREATE UNIQUE INDEX words_local_word_unique
      ON words(local_user_id, normalized_word)
      WHERE local_user_id IS NOT NULL AND deleted_at IS NULL;

    CREATE UNIQUE INDEX words_user_word_unique
      ON words(user_id, normalized_word)
      WHERE user_id IS NOT NULL AND deleted_at IS NULL;

    CREATE INDEX words_local_recent_index
      ON words(local_user_id, deleted_at, created_at DESC);

    CREATE INDEX words_local_status_index
      ON words(local_user_id, status, deleted_at);

    CREATE INDEX words_category_index
      ON words(category_id, deleted_at);

    CREATE INDEX words_next_review_index
      ON words(local_user_id, next_review_at, deleted_at);

    CREATE TABLE reviews (
      id TEXT PRIMARY KEY NOT NULL,
      word_id TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      local_user_id TEXT REFERENCES local_identity(local_user_id) ON DELETE CASCADE,
      response TEXT NOT NULL CHECK (response IN ('know', 'not_sure', 'forgot')),
      reviewed_at TEXT NOT NULL,
      scheduled_for TEXT,
      next_review_at TEXT,
      interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
      ease_factor REAL NOT NULL DEFAULT 2.5 CHECK (ease_factor > 0),
      created_at TEXT NOT NULL,
      CHECK (user_id IS NOT NULL OR local_user_id IS NOT NULL)
    );

    CREATE INDEX reviews_word_date_index
      ON reviews(word_id, reviewed_at DESC);

    CREATE INDEX reviews_local_date_index
      ON reviews(local_user_id, reviewed_at DESC);

    CREATE TABLE settings (
      setting_key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,
};

const addDefinitionAttribution: DatabaseMigration = {
  version: 2,
  name: 'add_definition_attribution',
  sql: `
    ALTER TABLE words ADD COLUMN definition_provider_name TEXT;
    ALTER TABLE words ADD COLUMN definition_provider_url TEXT;
    ALTER TABLE words ADD COLUMN definition_source_url TEXT;
    ALTER TABLE words ADD COLUMN definition_license_name TEXT;
    ALTER TABLE words ADD COLUMN definition_license_url TEXT;
  `,
};

const addFeatureUsageEvents: DatabaseMigration = {
  version: 3,
  name: 'add_feature_usage_events',
  sql: `
    CREATE TABLE feature_usage_events (
      id TEXT PRIMARY KEY NOT NULL,
      feature_key TEXT NOT NULL CHECK (feature_key IN ('csv_import')),
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      local_user_id TEXT NOT NULL REFERENCES local_identity(local_user_id) ON DELETE CASCADE,
      occurred_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local'
        CHECK (sync_status IN ('local', 'pending', 'synced', 'error')),
      CHECK (user_id IS NOT NULL OR local_user_id IS NOT NULL)
    );

    CREATE INDEX feature_usage_owner_index
      ON feature_usage_events(local_user_id, feature_key, occurred_at);

    CREATE INDEX feature_usage_account_sync_index
      ON feature_usage_events(user_id, sync_status, occurred_at)
      WHERE user_id IS NOT NULL;
  `,
};

export const databaseMigrations = [
  createInitialSchema,
  addDefinitionAttribution,
  addFeatureUsageEvents,
] as const satisfies readonly DatabaseMigration[];

export const DATABASE_VERSION = databaseMigrations[databaseMigrations.length - 1]?.version ?? 0;
