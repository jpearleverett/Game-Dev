import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

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

const API_KEYS = {
  apple: 'apl_your_api_key_here',
  google: 'goog_your_api_key_here',
};

class PurchaseService {
  constructor() {
    this.initialized = false;
    // Use Mock service in dev if API keys are missing or for testing flow
    this.backend = __DEV__ ? new MockPurchaseService() : null; 
  }

  async init() {
    if (this.initialized) return;

    if (this.backend?.isMock) {
      await this.backend.configure();
      this.initialized = true;
      return;
    }

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: API_KEYS.apple });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: API_KEYS.google });
    }
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
