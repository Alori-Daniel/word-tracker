import type { SQLiteDatabase } from 'expo-sqlite';

import { FREE_CSV_IMPORT_LIMIT } from '@/domain/subscription';
import type { CsvWordImportRecord } from '@/domain/csv-import';
import type { GuestIdentity } from '@/domain/vocabulary';

import { normalizeLookupValue } from '../database/value-mappers';
import { CategoryRepository } from './category-repository';
import type { RepositoryDependencies } from './repository-dependencies';
import { WordRepository } from './word-repository';

const IMPORT_CATEGORY_COLORS = [
  '#0878B8',
  '#7A5AF8',
  '#16856A',
  '#B66A12',
  '#A44F79',
  '#2563A8',
] as const;

export class CsvImportLimitError extends Error {
  constructor() {
    super('You have used all five free CSV imports.');
    this.name = 'CsvImportLimitError';
  }
}

export class CsvImportRepository {
  private readonly categories: CategoryRepository;
  private readonly words: WordRepository;

  constructor(
    private readonly database: SQLiteDatabase,
    private readonly identity: GuestIdentity,
    private readonly dependencies: RepositoryDependencies,
  ) {
    this.categories = new CategoryRepository(database, identity, dependencies);
    this.words = new WordRepository(database, identity, dependencies);
  }

  async countCompleted(): Promise<number> {
    const row = await this.database.getFirstAsync<{ count: number }>(
      `SELECT count(*) AS count
       FROM feature_usage_events
       WHERE feature_key = 'csv_import'
         AND local_user_id = $localUserId`,
      { $localUserId: this.identity.localUserId },
    );
    return row?.count ?? 0;
  }

  async import(records: readonly CsvWordImportRecord[], isPremium: boolean): Promise<number> {
    if (records.length === 0) return 0;

    await this.database.withTransactionAsync(async () => {
      if (!isPremium && (await this.countCompleted()) >= FREE_CSV_IMPORT_LIMIT) {
        throw new CsvImportLimitError();
      }

      const categories = await this.categories.list();
      const categoriesByName = new Map(
        categories.map((category) => [normalizeLookupValue(category.name), category]),
      );

      for (const record of records) {
        let categoryId: string | null = null;
        if (record.categoryName) {
          const key = normalizeLookupValue(record.categoryName);
          let category = categoriesByName.get(key);
          if (!category) {
            category = await this.categories.create({
              name: record.categoryName,
              color: IMPORT_CATEGORY_COLORS[categoriesByName.size % IMPORT_CATEGORY_COLORS.length],
            });
            categoriesByName.set(key, category);
          }
          categoryId = category.id;
        }

        await this.words.create({ ...record.input, categoryId });
      }

      if (!isPremium) {
        await this.database.runAsync(
          `INSERT INTO feature_usage_events (
             id, feature_key, user_id, local_user_id, occurred_at, sync_status
           ) VALUES (
             $id, 'csv_import', $userId, $localUserId, $occurredAt, $syncStatus
           )`,
          {
            $id: this.dependencies.createId(),
            $userId: this.identity.linkedUserId,
            $localUserId: this.identity.localUserId,
            $occurredAt: this.dependencies.now(),
            $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
          },
        );
      }
    });

    return records.length;
  }
}
