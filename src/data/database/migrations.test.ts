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
});
