import { uiTokens } from '../tokens';

describe('uiTokens', () => {
  it('expõe spacing com xs, sm, md, lg, xl, xxl, xxxl', () => {
    expect(uiTokens.spacing.xs).toBeDefined();
    expect(uiTokens.spacing.sm).toBeDefined();
    expect(uiTokens.spacing.md).toBeDefined();
    expect(uiTokens.spacing.lg).toBeDefined();
    expect(uiTokens.spacing.xl).toBeDefined();
    expect(uiTokens.spacing.xxl).toBeDefined();
    expect(uiTokens.spacing.xxxl).toBeDefined();
  });

  it('expõe borderRadius e screenPaddingHorizontal', () => {
    expect(uiTokens.borderRadius.sm).toBeDefined();
    expect(uiTokens.borderRadius.card).toBeDefined();
    expect(uiTokens.screenPaddingHorizontal).toBeDefined();
  });

  it('expõe layout (iconSizes, avatarSizes, sectionGap, etc)', () => {
    expect(uiTokens.iconSizes).toBeDefined();
    expect(uiTokens.avatarSizes).toBeDefined();
    expect(uiTokens.sectionGap).toBeDefined();
    expect(uiTokens.cardGap).toBeDefined();
    expect(uiTokens.maxContentWidth).toBeDefined();
  });
});
