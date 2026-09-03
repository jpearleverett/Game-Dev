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
  const raw = platform === 'ios' ? API_KEYS.apple : API_KEYS.google;
  // Must be a real string, not just truthy: an unset `extra` value used to
  // arrive as `{}` from the manifest, which is truthy, so this guard passed
  // and Purchases.configure was handed `{}` in a production build — the exact
  // failure the comment above says was fixed.
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (!key || PLACEHOLDER_KEY.test(key)) return null;
  return key;
};

/**
 * react-native-purchases is loaded LAZILY, and only on the real-store path.
 *
 * Its module body runs `new NativeEventEmitter(NativeModules.RNPurchases)` at
 * import time (dist/purchases.js). The native module is absent in Expo Go
 * (it is not in expo/bundledNativeModules.json), and RN's NativeEventEmitter
 * constructor asserts a non-null argument when `Platform.OS === 'ios'` — so a
 * static import of this package white-screened the app at boot on iOS Expo Go,
 * before any of our code ran. Android took the same path harmlessly because
 * that invariant is iOS-only.
 *
 * Requiring it on demand means Expo Go never evaluates it at all: `init()`
 * selects the mock backend under __DEV__ or a missing store key and returns
 * before this is ever called.
 */
let purchasesModule;
const loadPurchases = () => {
  if (purchasesModule === undefined) {
    // eslint-disable-next-line global-require
    const mod = require('react-native-purchases');
    purchasesModule = mod?.default || mod || null;
  }
  return purchasesModule;
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

    loadPurchases().configure({ apiKey: configuredKeyFor(Platform.OS) });
    this.initialized = true;
  }

  async getOfferings() {
    if (!this.initialized) await this.init();
    
    try {
      if (this.backend) return await this.backend.getOfferings();
      const offerings = await loadPurchases().getOfferings();
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
      const { customerInfo, productIdentifier } = await loadPurchases().purchasePackage(packageItem);
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
      const customerInfo = await loadPurchases().restorePurchases();
      return customerInfo;
    } catch (e) {
      console.error('Restore error', e);
      throw e;
    }
  }
}

export const purchaseService = new PurchaseService();
