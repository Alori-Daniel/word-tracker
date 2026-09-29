import type { SQLiteDatabase } from 'expo-sqlite';

import type { LinkAccountInput } from '@/domain/account';
import type { GuestIdentity } from '@/domain/vocabulary';

import { LOCAL_IDENTITY_SINGLETON_ID } from '../database/constants';
import type { LocalIdentityRow } from '../database/rows';
import { mapLocalIdentityRow } from '../database/value-mappers';
import type { RepositoryDependencies } from './repository-dependencies';

export class AccountMismatchError extends Error {
  constructor() {
    super('This local vault is already linked to a different account.');
    this.name = 'AccountMismatchError';
  }
}

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

  async linkAccount(account: LinkAccountInput): Promise<GuestIdentity> {
    const current = await this.getOrCreate();

    if (current.linkedUserId && current.linkedUserId !== account.userId) {
      throw new AccountMismatchError();
    }

    const updatedAt = this.dependencies.now();

    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO users (
           id, email, display_name, avatar_url, provider, provider_account_id,
           subscription_status, created_at, updated_at
         ) VALUES (
           $id, $email, $displayName, $avatarUrl, $provider, NULL,
           $subscriptionStatus, $createdAt, $updatedAt
         )
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           display_name = excluded.display_name,
           avatar_url = excluded.avatar_url,
           provider = excluded.provider,
           subscription_status = excluded.subscription_status,
           updated_at = excluded.updated_at`,
        {
          $id: account.userId,
          $email: account.email,
          $displayName: account.displayName,
          $avatarUrl: account.avatarUrl,
          $provider: account.provider,
          $subscriptionStatus: account.subscriptionStatus,
          $createdAt: updatedAt,
          $updatedAt: updatedAt,
        },
      );

      await this.database.runAsync(
        `UPDATE local_identity
         SET user_id = $userId, updated_at = $updatedAt
         WHERE singleton_id = $singletonId`,
        {
          $userId: account.userId,
          $updatedAt: updatedAt,
          $singletonId: LOCAL_IDENTITY_SINGLETON_ID,
        },
      );

      await this.database.runAsync(
        `UPDATE categories
         SET user_id = $userId, sync_status = 'pending', updated_at = $updatedAt
         WHERE local_user_id = $localUserId`,
        {
          $userId: account.userId,
          $localUserId: current.localUserId,
          $updatedAt: updatedAt,
        },
      );

      await this.database.runAsync(
        `UPDATE words
         SET user_id = $userId, sync_status = 'pending', updated_at = $updatedAt
         WHERE local_user_id = $localUserId`,
        {
          $userId: account.userId,
          $localUserId: current.localUserId,
          $updatedAt: updatedAt,
        },
      );

      await this.database.runAsync(
        `UPDATE reviews
         SET user_id = $userId
         WHERE local_user_id = $localUserId`,
        {
          $userId: account.userId,
          $localUserId: current.localUserId,
        },
      );

      await this.database.runAsync(
        `UPDATE feature_usage_events
         SET user_id = $userId, sync_status = 'pending'
         WHERE local_user_id = $localUserId`,
        {
          $userId: account.userId,
          $localUserId: current.localUserId,
        },
      );
    });

    const linked = await this.get();
    if (!linked) {
      throw new Error('The local vault was linked but could not be reloaded.');
    }

    return linked;
  }
}
