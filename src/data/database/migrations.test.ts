import { DATABASE_VERSION, databaseMigrations } from './migrations';

describe('database migrations', () => {
  it('keeps migration versions contiguous and ordered', () => {
    expect(databaseMigrations.map((migration) => migration.version)).toEqual(
      databaseMigrations.map((_migration, index) => index + 1),
    );
    expect(DATABASE_VERSION).toBe(databaseMigrations.length);
  });

  it('creates every Stage 2 table in the initial schema', () => {
    const initialSchema = databaseMigrations[0].sql;

    for (const table of ['users', 'local_identity', 'categories', 'words', 'reviews', 'settings']) {
      expect(initialSchema).toMatch(new RegExp(`CREATE TABLE ${table}\\b`));
    }
  });

  it('enforces local or authenticated ownership on user data', () => {
    const initialSchema = databaseMigrations[0].sql;
    expect(initialSchema.match(/CHECK \(user_id IS NOT NULL OR local_user_id IS NOT NULL\)/g)).toHaveLength(
      3,
    );
  });

  it('adds separate dictionary attribution fields without overloading reading context', () => {
    const attributionMigration = databaseMigrations[1].sql;

    for (const column of [
      'definition_provider_name',
      'definition_provider_url',
      'definition_source_url',
      'definition_license_name',
      'definition_license_url',
    ]) {
      expect(attributionMigration).toContain(`ADD COLUMN ${column} TEXT`);
    }
  });

  it('records CSV usage as idempotent, owned events', () => {
    const usageMigration = databaseMigrations[2].sql;

    expect(usageMigration).toContain('CREATE TABLE feature_usage_events');
    expect(usageMigration).toContain("feature_key IN ('csv_import')");
    expect(usageMigration).toContain('id TEXT PRIMARY KEY');
    expect(usageMigration).toContain('local_user_id TEXT NOT NULL');
    expect(usageMigration).toContain("sync_status IN ('local', 'pending', 'synced', 'error')");
  });
});
