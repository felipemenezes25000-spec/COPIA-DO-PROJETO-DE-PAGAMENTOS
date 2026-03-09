/**
 * Legacy theme — Pure re-export from lib/theme.ts
 * DO NOT add new tokens here. Use designSystem.ts or useAppTheme().
 */
import { theme, colors as themeColors, spacing as themeSpacing, borderRadius as themeBorderRadius, shadows as themeShadows, gradients as themeGradients } from '../lib/theme';
import { typography as dsTypography } from '../lib/designSystem';

export const colors = {
  ...themeColors,
  // Legacy aliases — all map to existing palette values
  primaryLighter: '#7DD3FC',  // palette.primary[300]
  primaryPale: '#BAE6FD',     // palette.primary[200]
  primaryPaler: '#E0F2FE',    // palette.primary[100]
  primaryDarker: '#075985',   // palette.primary[800]
  secondaryLight: '#34D399',  // emerald 400

  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  transparent: 'transparent',
};

export const spacing = themeSpacing;
export const borderRadius = { ...themeBorderRadius, xxl: 28 };
export const shadows = themeShadows;

export const typography = {
  // Delegated from designSystem — single source of truth
  h1: { fontSize: dsTypography.variants.h1.fontSize, fontWeight: dsTypography.variants.h1.fontWeight, lineHeight: Math.round(dsTypography.variants.h1.fontSize * dsTypography.variants.h1.lineHeight), letterSpacing: -0.5 },
  h2: { fontSize: dsTypography.variants.h2.fontSize, fontWeight: dsTypography.variants.h2.fontWeight, lineHeight: Math.round(dsTypography.variants.h2.fontSize * dsTypography.variants.h2.lineHeight), letterSpacing: -0.3 },
  h3: { fontSize: dsTypography.variants.h3.fontSize, fontWeight: dsTypography.variants.h3.fontWeight, lineHeight: Math.round(dsTypography.variants.h3.fontSize * dsTypography.variants.h3.lineHeight) },
  h4: { fontSize: dsTypography.variants.title.fontSize, fontWeight: dsTypography.variants.title.fontWeight, lineHeight: Math.round(dsTypography.variants.title.fontSize * dsTypography.variants.title.lineHeight) },
  body: { fontSize: dsTypography.variants.bodyLg.fontSize, fontWeight: dsTypography.variants.bodyLg.fontWeight, lineHeight: Math.round(dsTypography.variants.bodyLg.fontSize * dsTypography.variants.bodyLg.lineHeight) },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  bodySemiBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  bodySmall: { fontSize: dsTypography.variants.body2.fontSize, fontWeight: dsTypography.variants.body2.fontWeight, lineHeight: Math.round(dsTypography.variants.body2.fontSize * dsTypography.variants.body2.lineHeight) },
  bodySmallMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  caption: { fontSize: dsTypography.variants.caption.fontSize, fontWeight: '500' as const, lineHeight: Math.round(dsTypography.variants.caption.fontSize * dsTypography.variants.caption.lineHeight) },
  captionSmall: { fontSize: dsTypography.variants.overline.fontSize, fontWeight: dsTypography.variants.overline.fontWeight, lineHeight: 14, letterSpacing: 0.5 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },
};

export const gradients = {
  ...themeGradients,
  primary: ['#0284C7', '#0EA5E9'] as const,
  primaryLight: ['#38BDF8', '#0EA5E9'] as const,
  light: ['#E0F2FE', '#BAE6FD'] as const,
  pale: ['#E0F2FE', '#F0F8FF'] as const,
  warm: ['#10B981', '#059669'] as const,
  dark: ['#0284C7', '#075985'] as const,
  success: ['#10B981', '#059669'] as const,
};

export { theme };
