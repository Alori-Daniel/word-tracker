import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { useAccount } from '@/features/auth';
import {
  FREE_SUBSCRIPTION_SNAPSHOT,
  isPurchaseCancellation,
  revenueCatApiKeyForPlatform,
  revenueCatClient,
  subscriptionPackagesFromOffering,
  subscriptionSnapshotFromCustomerInfo,
  trialEligibilityForPackage,
  type SubscriptionSnapshot,
  type TrialEligibilityByProduct,
} from '@/services/subscriptions';

export type SubscriptionOperation = 'purchase' | 'restore' | null;

type SubscriptionContextValue = {
  appUserId: string | null;
  errorMessage: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  isLoadingOffering: boolean;
  offering: PurchasesOffering | null;
  operation: SubscriptionOperation;
  purchase: (item: PurchasesPackage) => Promise<'cancelled' | 'purchased'>;
  refresh: () => Promise<void>;
  reloadOffering: () => Promise<void>;
  restore: () => Promise<boolean>;
  subscription: SubscriptionSnapshot;
  trialEligibility: TrialEligibilityByProduct;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
const configuredApiKey = revenueCatApiKeyForPlatform();

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { account, isInitializing: isAccountInitializing } = useAccount();
  const [subscription, setSubscription] = useState(FREE_SUBSCRIPTION_SNAPSHOT);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configuredApiKey !== null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(configuredApiKey !== null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [operation, setOperation] = useState<SubscriptionOperation>(null);
  const [trialEligibility, setTrialEligibility] = useState<TrialEligibilityByProduct>({});
  const accountUserId = account?.userId ?? null;

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    setSubscription(subscriptionSnapshotFromCustomerInfo(customerInfo));
    setErrorMessage(null);
  }, []);

  const reloadOffering = useCallback(async () => {
    if (!configuredApiKey) return;

    setIsLoadingOffering(true);
    setErrorMessage(null);

    try {
      const nextOffering = await revenueCatClient.getCurrentOffering();
      setOffering(nextOffering);

      const packages = subscriptionPackagesFromOffering(nextOffering);
      const availablePackages = [packages.annual, packages.monthly].filter(
        (item): item is PurchasesPackage => item !== null,
      );
      const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'other';
      const iosEligibility =
        platform === 'ios' && availablePackages.length > 0
          ? await revenueCatClient.checkTrialEligibility(
              availablePackages.map((item) => item.product.identifier),
            )
          : {};

      setTrialEligibility(
        Object.fromEntries(
          availablePackages.map((item) => [
            item.product.identifier,
            trialEligibilityForPackage(item, platform, iosEligibility[item.product.identifier]),
          ]),
        ),
      );
    } catch {
      setOffering(null);
      setTrialEligibility({});
      setErrorMessage('Premium plans could not be loaded. Please try again.');
    } finally {
      setIsLoadingOffering(false);
    }
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
        if (isActive) await reloadOffering();
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
  }, [accountUserId, applyCustomerInfo, isAccountInitializing, reloadOffering]);

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

  const purchase = useCallback(
    async (item: PurchasesPackage): Promise<'cancelled' | 'purchased'> => {
      if (!configuredApiKey) throw new Error('RevenueCat is not configured.');

      setOperation('purchase');
      setErrorMessage(null);

      try {
        const customerInfo = await revenueCatClient.purchasePackage(item);
        applyCustomerInfo(customerInfo);
        return 'purchased';
      } catch (error) {
        if (isPurchaseCancellation(error)) return 'cancelled';
        setErrorMessage('The purchase could not be completed. Please try again.');
        throw error;
      } finally {
        setOperation(null);
      }
    },
    [applyCustomerInfo],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    if (!configuredApiKey) throw new Error('RevenueCat is not configured.');

    setOperation('restore');
    setErrorMessage(null);

    try {
      const customerInfo = await revenueCatClient.restorePurchases();
      const nextSubscription = subscriptionSnapshotFromCustomerInfo(customerInfo);
      applyCustomerInfo(customerInfo);
      return nextSubscription.isPremium;
    } catch (error) {
      setErrorMessage('Purchases could not be restored. Please try again.');
      throw error;
    } finally {
      setOperation(null);
    }
  }, [applyCustomerInfo]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      appUserId,
      errorMessage,
      isConfigured: configuredApiKey !== null,
      isLoading,
      isLoadingOffering,
      offering,
      operation,
      purchase,
      refresh,
      reloadOffering,
      restore,
      subscription,
      trialEligibility,
    }),
    [
      appUserId,
      errorMessage,
      isLoading,
      isLoadingOffering,
      offering,
      operation,
      purchase,
      refresh,
      reloadOffering,
      restore,
      subscription,
      trialEligibility,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider.');
  return context;
}
