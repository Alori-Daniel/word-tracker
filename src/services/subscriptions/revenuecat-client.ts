import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type IntroEligibility,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

export class RevenueCatClient {
  private initialization: Promise<CustomerInfo> | null = null;
  private identityQueue: Promise<unknown> = Promise.resolve();

  initialize(apiKey: string): Promise<CustomerInfo> {
    if (this.initialization) return this.initialization;

    const operation = (async () => {
      if (!(await Purchases.isConfigured())) {
        if (__DEV__) {
          await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        Purchases.configure({ apiKey });
      }

      return Purchases.getCustomerInfo();
    })();

    this.initialization = operation.catch((error: unknown) => {
      this.initialization = null;
      throw error;
    });

    return this.initialization;
  }

  addCustomerInfoListener(listener: CustomerInfoUpdateListener): void {
    Purchases.addCustomerInfoUpdateListener(listener);
  }

  removeCustomerInfoListener(listener: CustomerInfoUpdateListener): void {
    Purchases.removeCustomerInfoUpdateListener(listener);
  }

  refresh(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo();
  }

  async getCurrentOffering(): Promise<PurchasesOffering | null> {
    return (await Purchases.getOfferings()).current;
  }

  checkTrialEligibility(productIdentifiers: string[]): Promise<Record<string, IntroEligibility>> {
    return Purchases.checkTrialOrIntroductoryPriceEligibility(productIdentifiers);
  }

  async purchasePackage(item: PurchasesPackage): Promise<CustomerInfo> {
    return (await Purchases.purchasePackage(item)).customerInfo;
  }

  restorePurchases(): Promise<CustomerInfo> {
    return Purchases.restorePurchases();
  }

  getAppUserId(): Promise<string> {
    return Purchases.getAppUserID();
  }

  syncIdentity(userId: string | null): Promise<CustomerInfo> {
    const operation = this.identityQueue.catch(() => undefined).then(async () => {
      if (userId) {
        const currentUserId = await Purchases.getAppUserID();
        if (currentUserId === userId) return Purchases.getCustomerInfo();
        return (await Purchases.logIn(userId)).customerInfo;
      }

      if (await Purchases.isAnonymous()) return Purchases.getCustomerInfo();
      return Purchases.logOut();
    });

    this.identityQueue = operation;
    return operation;
  }
}

export const revenueCatClient = new RevenueCatClient();
