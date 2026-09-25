import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, databaseMigrations } from './migrations';

type UserVersionRow = {
  user_version: number;
};

type ForeignKeyViolationRow = {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
};

export class UnsupportedDatabaseVersionError extends Error {
  constructor(foundVersion: number) {
    super(
      `The local database version (${foundVersion}) is newer than this app supports (${DATABASE_VERSION}).`,
    );
    this.name = 'UnsupportedDatabaseVersionError';
  }
}

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const versionRow = await database.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new UnsupportedDatabaseVersionError(currentVersion);
  }

  for (const migration of databaseMigrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  await database.execAsync('PRAGMA foreign_keys = ON;');

  const violation = await database.getFirstAsync<ForeignKeyViolationRow>('PRAGMA foreign_key_check');
  if (violation) {
    throw new Error(
      `Local database integrity check failed for ${violation.table} row ${violation.rowid}.`,
    );
  }
}
