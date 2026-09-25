import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AccountMismatchError, useLocalData } from '@/data';
import type { AccountProfile, CloudSyncState, SubscriptionStatus } from '@/domain/account';
import { accountProfileFromSession, SupabaseGoogleAuth } from '@/services/auth';
import { CloudVaultError, SupabaseVaultClient, syncVault } from '@/services/cloud';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

type AccountContextValue = {
  account: AccountProfile | null;
  errorMessage: string | null;
  getAccessToken: () => Promise<string | null>;
  isConfigured: boolean;
  isInitializing: boolean;
  isSigningIn: boolean;
  queueSync: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  syncState: CloudSyncState;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: PropsWithChildren) {
  const { identity, linkAccount, notifyCloudDataChanged, repositories } = useLocalData();
  const client = useMemo(() => getSupabaseClient(), []);
  const auth = useMemo(() => (client ? new SupabaseGoogleAuth(client) : null), [client]);
  const cloud = useMemo(() => (client ? new SupabaseVaultClient(client) : null), [client]);
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [cloudPlan, setCloudPlan] = useState<{
    userId: string;
    subscriptionStatus: SubscriptionStatus;
  } | null>(null);
  const [isInitializing, setIsInitializing] = useState(configured);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<CloudSyncState>(
    configured
      ? { status: 'idle', lastSyncedAt: null, message: null }
      : {
          status: 'disabled',
          lastSyncedAt: null,
          message: 'Cloud backup is not configured in this build.',
        },
  );
  const syncPromise = useRef<Promise<void> | null>(null);
  const queuedSync = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activatedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    let isActive = true;

    void auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) setErrorMessage('Your saved account session could not be restored.');
        setSession(data.session);
      })
      .finally(() => {
        if (isActive) setIsInitializing(false);
      });

    const { data } = auth.onAuthStateChange((nextSession) => {
      if (isActive) setSession(nextSession);
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, [auth]);

  const syncNow = useCallback(async () => {
    if (!session || !cloud || identity.linkedUserId !== session.user.id) return;
    if (syncPromise.current) return syncPromise.current;

    const previousLastSync = syncState.lastSyncedAt;
    const operation = (async () => {
      setSyncState({ status: 'syncing', lastSyncedAt: previousLastSync, message: null });

      try {
        const result = await syncVault(repositories, cloud, session.user.id);
        const syncedAt = new Date().toISOString();
        setCloudPlan({
          userId: result.profile.userId,
          subscriptionStatus: result.profile.subscriptionStatus,
        });
        setSyncState({ status: 'idle', lastSyncedAt: syncedAt, message: null });
        notifyCloudDataChanged();
      } catch (error) {
        const message =
          error instanceof CloudVaultError
            ? error.message
            : 'Your local vault is safe, but cloud backup could not finish.';
        setSyncState({ status: 'error', lastSyncedAt: previousLastSync, message });
        throw error;
      } finally {
        syncPromise.current = null;
      }
    })();

    syncPromise.current = operation;
    return operation;
  }, [cloud, identity.linkedUserId, notifyCloudDataChanged, repositories, session, syncState.lastSyncedAt]);

  useEffect(() => {
    if (!session || !auth) {
      activatedToken.current = null;
      return;
    }

    let isActive = true;
    const currentSession = session;
    const currentAuth = auth;
    const profile = accountProfileFromSession(currentSession);

    async function activate() {
      try {
        if (identity.linkedUserId !== currentSession.user.id) {
          setSyncState((current) => ({
            status: 'syncing',
            lastSyncedAt: current.lastSyncedAt,
            message: 'Preparing your local words for backup…',
          }));
          await linkAccount(profile);
          return;
        }

        if (activatedToken.current === currentSession.access_token) return;
        activatedToken.current = currentSession.access_token;
        await syncNow();
      } catch (error) {
        if (!isActive) return;

        if (error instanceof AccountMismatchError) {
          activatedToken.current = null;
          await currentAuth.signOut().catch(() => undefined);
          setSession(null);
          setErrorMessage(
            'This device vault is linked to another account. Sign in with the original Google account.',
          );
        } else {
          setErrorMessage('You are signed in, but cloud backup needs another try.');
        }
      }
    }

    void activate();

    return () => {
      isActive = false;
    };
  }, [auth, identity.linkedUserId, linkAccount, session, syncNow]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setErrorMessage('Google sign-in is not configured in this build.');
      return false;
    }

    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      const nextSession = await auth.signIn();
      if (!nextSession) return false;
      setSession(nextSession);
      return true;
    } catch {
      setErrorMessage('Google sign-in could not be completed. Please try again.');
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [auth]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    setErrorMessage(null);

    try {
      await auth.signOut();
      setSession(null);
    } catch {
      setErrorMessage('Sign out could not be completed. Please try again.');
    }
  }, [auth]);

  const queueSync = useCallback(() => {
    if (!session || identity.linkedUserId !== session.user.id) return;
    if (queuedSync.current) clearTimeout(queuedSync.current);

    queuedSync.current = setTimeout(() => {
      queuedSync.current = null;
      void syncNow().catch(() => undefined);
    }, 1_000);
  }, [identity.linkedUserId, session, syncNow]);

  useEffect(
    () => () => {
      if (queuedSync.current) clearTimeout(queuedSync.current);
    },
    [],
  );

  const getAccessToken = useCallback(async () => {
    if (!auth) return null;
    const { data, error } = await auth.getSession();
    return error ? null : (data.session?.access_token ?? null);
  }, [auth]);

  const account = useMemo<AccountProfile | null>(() => {
    if (!session) return null;
    const profile = accountProfileFromSession(session);

    return cloudPlan?.userId === profile.userId
      ? { ...profile, subscriptionStatus: cloudPlan.subscriptionStatus }
      : profile;
  }, [cloudPlan, session]);

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      errorMessage,
      getAccessToken,
      isConfigured: configured,
      isInitializing,
      isSigningIn,
      queueSync,
      signInWithGoogle,
      signOut,
      syncNow,
      syncState,
    }),
    [account, configured, errorMessage, getAccessToken, isInitializing, isSigningIn, queueSync, signInWithGoogle, signOut, syncNow, syncState],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used within AccountProvider.');
  return context;
}
