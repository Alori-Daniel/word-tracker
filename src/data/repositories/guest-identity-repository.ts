import type { SQLiteDatabase } from 'expo-sqlite';

import type { GuestIdentity } from '@/domain/vocabulary';

import { LOCAL_IDENTITY_SINGLETON_ID } from '../database/constants';
import type { LocalIdentityRow } from '../database/rows';
import { mapLocalIdentityRow } from '../database/value-mappers';
import type { RepositoryDependencies } from './repository-dependencies';

export class GuestIdentityRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly dependencies: RepositoryDependencies,
  ) {}

  async get(): Promise<GuestIdentity | null> {
    const row = await this.database.getFirstAsync<LocalIdentityRow>(
      `SELECT local_user_id, device_id, user_id, created_at, updated_at
       FROM local_identity
       WHERE singleton_id = ?`,
      LOCAL_IDENTITY_SINGLETON_ID,
    );

    return row ? mapLocalIdentityRow(row) : null;
  }

  async getOrCreate(): Promise<GuestIdentity> {
    const existingIdentity = await this.get();
    if (existingIdentity) {
      return existingIdentity;
    }

    const createdAt = this.dependencies.now();

    await this.database.runAsync(
      `INSERT OR IGNORE INTO local_identity (
         singleton_id, local_user_id, device_id, user_id, created_at, updated_at
       ) VALUES ($singletonId, $localUserId, $deviceId, NULL, $createdAt, $updatedAt)`,
      {
        $singletonId: LOCAL_IDENTITY_SINGLETON_ID,
        $localUserId: this.dependencies.createId(),
        $deviceId: this.dependencies.createId(),
        $createdAt: createdAt,
        $updatedAt: createdAt,
      },
    );

    const identity = await this.get();
    if (!identity) {
      throw new Error('Unable to initialize the local guest identity.');
    }

    return identity;
  }
}
