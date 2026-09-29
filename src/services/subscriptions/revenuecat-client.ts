import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
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
