jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'standalone',
    appOwnership: null,
  },
  ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone' },
}));

import { isExpoGo } from '../expo-go';

describe('expo-go', () => {
  it('isExpoGo é exportado e é boolean', () => {
    expect(typeof isExpoGo).toBe('boolean');
  });
});
