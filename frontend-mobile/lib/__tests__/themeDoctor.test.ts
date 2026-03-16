import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  gradients,
  doctorDS,
} from '../themeDoctor';

describe('themeDoctor', () => {
  it('expõe colors', () => {
    expect(colors).toBeDefined();
    expect(typeof colors).toBe('object');
  });

  it('expõe spacing, borderRadius, shadows, typography', () => {
    expect(spacing).toBeDefined();
    expect(borderRadius).toBeDefined();
    expect(shadows).toBeDefined();
    expect(typography).toBeDefined();
  });

  it('expõe gradients com doctorHeader, primary, subtle', () => {
    expect(gradients.doctorHeader).toBeDefined();
    expect(gradients.primary).toBeDefined();
    expect(gradients.subtle).toBeDefined();
  });

  it('expõe doctorDS com cardRadius, cardPadding, buttonHeight, etc', () => {
    expect(doctorDS.cardRadius).toBeDefined();
    expect(doctorDS.cardPadding).toBeDefined();
    expect(doctorDS.sectionGap).toBeDefined();
    expect(doctorDS.buttonHeight).toBeDefined();
    expect(doctorDS.screenPaddingHorizontal).toBeDefined();
  });
});
