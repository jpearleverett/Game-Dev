import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Mock implementation for development/testing
class MockPurchaseService {
  constructor() {
    this.isMock = true;
    this.offerings = {
      current: {
        availablePackages: [
          {
            identifier: '$rc_monthly',
            packageType: 'MONTHLY',
            product: {
              identifier: 'com.deadletters.bribe_clerk',
              description: 'Bribe the Clerk (Unlock Next Chapter)',
              title: 'Bribe the Clerk',
              price: 0.99,
              priceString: '$0.99',
              currencyCode: 'USD',
            },
          },
          {
            identifier: '$rc_lifetime',
            packageType: 'LIFETIME',
            product: {
              identifier: 'com.deadletters.full_unlock',
              description: 'Unlock Full Story',
              title: 'Full Story Access',
              price: 6.99,
              priceString: '$6.99',
              currencyCode: 'USD',
            },
          },
        ],
      },
    };
  }

  async configure() {
    console.log('[MockPurchase] Configured');
  }

  async getOfferings() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return this.offerings;
  }

  async purchasePackage(packageToPurchase) {
    console.log('[MockPurchase] Purchasing:', packageToPurchase.product.identifier);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      customerInfo: {
        entitlements: {
          active: {
            [packageToPurchase.product.identifier]: {
              isActive: true,
            }
          }
        }
      },
      productIdentifier: packageToPurchase.product.identifier
    };
  }

  async restorePurchases() {
    console.log('[MockPurchase] Restoring purchases...');
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      entitlements: { active: {} }
    };
  }
}

// RevenueCat keys come from EAS secrets via app.config.js extra, the same way
// the proxy URL and the analytics key do. They used to be the literal
// placeholders below, which in a production build (where __DEV__ is false, so
// there is no mock backend either) meant Purchases.configure was handed a key
// RevenueCat rejects: getOfferings returned null, every purchase threw
// "package not found", the throw was swallowed, and the player saw a purchase
// that silently did nothing.
const PLACEHOLDER_KEY = /^(apl|goog)_your_api_key_here$/;
const API_KEYS = {
  apple: Constants.expoConfig?.extra?.revenueCatAppleKey || null,
  google: Constants.expoConfig?.extra?.revenueCatGoogleKey || null,
};

const configuredKeyFor = (platform) => {
  const key = platform === 'ios' ? API_KEYS.apple : API_KEYS.google;
  if (!key || PLACEHOLDER_KEY.test(key)) return null;
  return key;
};

class PurchaseService {
  constructor() {
    this.initialized = false;
    // Mock in dev, and anywhere the store key is missing — better a loud mock
    // than a live configure with a key the store will reject.
    this.backend = __DEV__ ? new MockPurchaseService() : null;
  }

  async init() {
    if (this.initialized) return;

    if (!this.backend?.isMock) {
      const key = configuredKeyFor(Platform.OS);
      if (!key) {
        console.warn(
          `[Purchase] No RevenueCat key configured for ${Platform.OS}. `
          + 'Falling back to the mock backend; purchases will not be real. '
          + 'Set revenueCatAppleKey / revenueCatGoogleKey in EAS secrets.'
        );
        this.backend = new MockPurchaseService();
      }
    }

    if (this.backend?.isMock) {
      await this.backend.configure();
      this.initialized = true;
      return;
    }

    Purchases.configure({ apiKey: configuredKeyFor(Platform.OS) });
    this.initialized = true;
  }

  async getOfferings() {
    if (!this.initialized) await this.init();
    
    try {
      if (this.backend) return await this.backend.getOfferings();
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (e) {
      console.error('Error fetching offerings', e);
      return null;
    }
  }

  async purchasePackage(packageItem) {
    if (!this.initialized) await this.init();

    try {
      if (this.backend) return await this.backend.purchasePackage(packageItem);
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageItem);
      return { customerInfo, productIdentifier };
    } catch (e) {
      if (!e.userCancelled) {
        console.error('Purchase error', e);
        throw e;
      }
      return { userCancelled: true };
    }
  }

  async restorePurchases() {
    if (!this.initialized) await this.init();
    
    try {
      if (this.backend) return await this.backend.restorePurchases();
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (e) {
      console.error('Restore error', e);
      throw e;
    }
  }
}

export const purchaseService = new PurchaseService();
