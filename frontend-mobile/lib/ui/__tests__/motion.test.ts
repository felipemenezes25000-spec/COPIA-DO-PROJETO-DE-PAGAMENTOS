jest.mock('react-native', () => ({
  Easing: {
    bezier: jest.fn(() => ({})),
    out: jest.fn((e: any) => e),
    cubic: {},
  },
  Platform: { OS: 'ios' },
}));

import { motionTokens } from '../motion';

describe('motion', () => {
  it('expõe easing default, soft, snappy', () => {
    expect(motionTokens.easing.default).toBeDefined();
    expect(motionTokens.easing.soft).toBeDefined();
    expect(motionTokens.easing.snappy).toBeDefined();
  });

  it('expõe fade com patient e doctor variants', () => {
    expect(motionTokens.fade.patient).toBeDefined();
    expect(motionTokens.fade.doctor).toBeDefined();
    expect(motionTokens.fade.patient.duration).toBe(260);
  });

  it('expõe nav com rootStack, modal, authStack', () => {
    expect(motionTokens.nav.rootStack).toBeDefined();
    expect(motionTokens.nav.modal).toBeDefined();
    expect(motionTokens.nav.authStack).toBeDefined();
  });
});
