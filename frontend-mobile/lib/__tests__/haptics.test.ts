/**
 * Haptics: mock de expo-haptics e react-native para carregar em ambiente node.
 * Testamos que a API existe e não lança.
 */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { haptics } from '../haptics';

describe('haptics', () => {
  it('expõe light, medium, heavy', () => {
    expect(() => haptics.light()).not.toThrow();
    expect(() => haptics.medium()).not.toThrow();
    expect(() => haptics.heavy()).not.toThrow();
  });

  it('expõe success, warning, error', () => {
    expect(() => haptics.success()).not.toThrow();
    expect(() => haptics.warning()).not.toThrow();
    expect(() => haptics.error()).not.toThrow();
  });

  it('expõe selection', () => {
    expect(() => haptics.selection()).not.toThrow();
  });
});
