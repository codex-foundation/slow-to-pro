const Purchases = {
  configure: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({
    entitlements: { active: {} },
  }),
  getOfferings: jest.fn().mockResolvedValue({ current: null }),
  purchasePackage: jest.fn().mockResolvedValue({
    customerInfo: { entitlements: { active: {} } },
  }),
  restorePurchases: jest.fn().mockResolvedValue({
    entitlements: { active: {} },
  }),
  setLogLevel: jest.fn(),
  LOG_LEVEL: { VERBOSE: 'VERBOSE', DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
};

export default Purchases;
export const LOG_LEVEL = Purchases.LOG_LEVEL;
