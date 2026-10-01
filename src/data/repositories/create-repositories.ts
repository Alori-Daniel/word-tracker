import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import { CategoryRepository } from './category-repository';
import { CsvImportRepository } from './csv-import-repository';
import { GuestIdentityRepository } from './guest-identity-repository';
import type { RepositoryDependencies } from './repository-dependencies';
import { ReviewRepository } from './review-repository';
import { SettingsRepository } from './settings-repository';
import { WordRepository } from './word-repository';
import { VaultSyncRepository } from './vault-sync-repository';

export function createRepositoryDependencies(): RepositoryDependencies {
  return {
    createId: () => Crypto.randomUUID(),
    now: () => new Date().toISOString(),
  };
}

export function createBootstrapRepositories(database: SQLiteDatabase) {
  const dependencies = createRepositoryDependencies();

  return {
    identity: new GuestIdentityRepository(database, dependencies),
    settings: new SettingsRepository(database, dependencies),
  };
}

export function createRepositories(database: SQLiteDatabase, identity: GuestIdentity) {
  const dependencies = createRepositoryDependencies();

  return {
    categories: new CategoryRepository(database, identity, dependencies),
    csvImports: new CsvImportRepository(database, identity, dependencies),
    reviews: new ReviewRepository(database, identity, dependencies),
    settings: new SettingsRepository(database, dependencies),
    sync: new VaultSyncRepository(database, identity),
    words: new WordRepository(database, identity, dependencies),
  };
}

export type LocalRepositories = ReturnType<typeof createRepositories>;
