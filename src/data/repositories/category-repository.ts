import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, GuestIdentity } from '@/domain/vocabulary';

import type { CategoryRow } from '../database/rows';
import {
  mapCategoryRow,
  normalizeLookupValue,
  normalizeRequiredText,
} from '../database/value-mappers';
import type { RepositoryDependencies } from './repository-dependencies';

export const DEFAULT_CATEGORIES = [
  { name: 'General', color: '#0878B8' },
  { name: 'School', color: '#7A5AF8' },
  { name: 'Programming', color: '#2563A8' },
  { name: 'Business', color: '#B66A12' },
  { name: 'Literature', color: '#A44F79' },
  { name: 'IELTS', color: '#16856A' },
  { name: 'Personal', color: '#6B7280' },
] as const;

export type CreateCategoryInput = {
  name: string;
  color: string;
};

export class CategoryRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly identity: GuestIdentity,
    private readonly dependencies: RepositoryDependencies,
  ) {}

  async list(): Promise<Category[]> {
    const rows = await this.database.getAllAsync<CategoryRow>(
      `SELECT *
       FROM categories
       WHERE local_user_id = $localUserId AND deleted_at IS NULL
       ORDER BY is_default DESC, name COLLATE NOCASE ASC`,
      { $localUserId: this.identity.localUserId },
    );

    return rows.map(mapCategoryRow);
  }

  async getById(id: string): Promise<Category | null> {
    const row = await this.database.getFirstAsync<CategoryRow>(
      `SELECT *
       FROM categories
       WHERE id = $id AND local_user_id = $localUserId AND deleted_at IS NULL`,
      { $id: id, $localUserId: this.identity.localUserId },
    );

    return row ? mapCategoryRow(row) : null;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const name = normalizeRequiredText(input.name, 'Category name');
    const color = normalizeRequiredText(input.color, 'Category color');
    const id = this.dependencies.createId();
    const timestamp = this.dependencies.now();

    await this.insert({ id, name, color, isDefault: false, timestamp, ignoreConflicts: false });

    const category = await this.getById(id);
    if (!category) {
      throw new Error('The category was saved but could not be loaded.');
    }

    return category;
  }

  async seedDefaults(): Promise<void> {
    const timestamp = this.dependencies.now();

    for (const category of DEFAULT_CATEGORIES) {
      await this.insert({
        id: this.dependencies.createId(),
        ...category,
        isDefault: true,
        timestamp,
        ignoreConflicts: true,
      });
    }
  }

  async softDelete(id: string): Promise<boolean> {
    const timestamp = this.dependencies.now();
    const result = await this.database.runAsync(
      `UPDATE categories
       SET deleted_at = $timestamp,
           updated_at = $timestamp,
           sync_status = $syncStatus
       WHERE id = $id
         AND local_user_id = $localUserId
         AND is_default = 0
         AND deleted_at IS NULL`,
      {
        $timestamp: timestamp,
        $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
        $id: id,
        $localUserId: this.identity.localUserId,
      },
    );

    return result.changes > 0;
  }

  private async insert({
    id,
    name,
    color,
    isDefault,
    timestamp,
    ignoreConflicts,
  }: {
    id: string;
    name: string;
    color: string;
    isDefault: boolean;
    timestamp: string;
    ignoreConflicts: boolean;
  }): Promise<void> {
    const conflictClause = ignoreConflicts ? 'OR IGNORE' : '';

    await this.database.runAsync(
      `INSERT ${conflictClause} INTO categories (
         id, user_id, local_user_id, name, normalized_name, color, is_default,
         sync_status, created_at, updated_at, deleted_at
       ) VALUES (
         $id, $userId, $localUserId, $name, $normalizedName, $color, $isDefault,
         $syncStatus, $createdAt, $updatedAt, NULL
       )`,
      {
        $id: id,
        $userId: this.identity.linkedUserId,
        $localUserId: this.identity.localUserId,
        $name: name,
        $normalizedName: normalizeLookupValue(name),
        $color: color,
        $isDefault: isDefault ? 1 : 0,
        $syncStatus: this.identity.linkedUserId ? 'pending' : 'local',
        $createdAt: timestamp,
        $updatedAt: timestamp,
      },
    );
  }
}
