import type { CustomerInfo, CustomerInfoUpdateListener } from 'react-native-purchases';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAccount } from '@/features/auth';
import {
  FREE_SUBSCRIPTION_SNAPSHOT,
  revenueCatApiKeyForPlatform,
  revenueCatClient,
  subscriptionSnapshotFromCustomerInfo,
  type SubscriptionSnapshot,
} from '@/services/subscriptions';

type SubscriptionContextValue = {
  appUserId: string | null;
  errorMessage: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  subscription: SubscriptionSnapshot;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
const configuredApiKey = revenueCatApiKeyForPlatform();

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { account, isInitializing: isAccountInitializing } = useAccount();
  const [subscription, setSubscription] = useState(FREE_SUBSCRIPTION_SNAPSHOT);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configuredApiKey !== null);
  const accountUserId = account?.userId ?? null;

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    setSubscription(subscriptionSnapshotFromCustomerInfo(customerInfo));
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!configuredApiKey || isAccountInitializing) {
      return;
    }

    let isActive = true;
    const listener: CustomerInfoUpdateListener = (customerInfo) => {
      if (isActive) applyCustomerInfo(customerInfo);
    };

    void Promise.resolve()
      .then(() => {
        if (isActive) setIsLoading(true);
        return revenueCatClient.initialize(configuredApiKey);
      })
      .then(() => revenueCatClient.syncIdentity(accountUserId))
      .then(async (customerInfo) => {
        if (!isActive) return;
        revenueCatClient.addCustomerInfoListener(listener);
        applyCustomerInfo(customerInfo);
        const nextAppUserId = await revenueCatClient.getAppUserId();
        if (isActive) setAppUserId(nextAppUserId);
      })
      .catch(() => {
        if (!isActive) return;
        setErrorMessage('Premium status could not be loaded. Please try again.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
      revenueCatClient.removeCustomerInfoListener(listener);
    };
  }, [accountUserId, applyCustomerInfo, isAccountInitializing]);

  const refresh = useCallback(async () => {
    if (!configuredApiKey) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const customerInfo = await revenueCatClient.refresh();
      applyCustomerInfo(customerInfo);
      setAppUserId(await revenueCatClient.getAppUserId());
    } catch {
      setErrorMessage('Premium status could not be refreshed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [applyCustomerInfo]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      appUserId,
      errorMessage,
      isConfigured: configuredApiKey !== null,
      isLoading,
      refresh,
      subscription,
    }),
    [appUserId, errorMessage, isLoading, refresh, subscription],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider.');
  return context;
}
