
/**
 * RenoveJá+ Design System - Unified Theme (v2 - Redesign)
 * Supports Light & Dark modes via semantic tokens.
 *
 * MUDANÇAS v2:
 * - Border radius mais consistente e moderno (cards 20, buttons 14)
 * - Sombras mais suaves
 * - Tipografia com melhor hierarquia visual
 */

// -----------------------------------------------------------------------------
// 1. Primitive Colors (Palette) — SEM MUDANÇAS (manter tema)
// -----------------------------------------------------------------------------
const palette = {
  primary: {
    50: '#F0F9FF', 100: '#E0F2FE', 200: '#BAE6FD', 300: '#7DD3FC',
    400: '#38BDF8', 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1',
    800: '#075985', 900: '#0C4A6E', 950: '#082F49',
  },
  secondary: {
    50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4',
    400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E',
    800: '#115E59', 900: '#134E4A', 950: '#042F2E',
  },
  neutral: {
    0: '#FFFFFF', 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0',
    300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569',
    700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#020617',
  },
  error: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
  success: { 50: '#F0FDF4', 100: '#DCFCE7', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
  info: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
} as const;

// -----------------------------------------------------------------------------
// 2. Semantic Tokens (Theme)
// -----------------------------------------------------------------------------
export const theme = {
  colors: {
    primary: {
      main: palette.primary[600],
      light: palette.primary[500],
      dark: palette.primary[700],
      soft: palette.primary[50],
      contrast: palette.neutral[0],
      ghost: palette.primary[50],
    },
    secondary: {
      main: palette.secondary[600],
      light: palette.secondary[500],
      dark: palette.secondary[700],
      soft: palette.secondary[50],
      contrast: palette.neutral[0],
    },
    
    // Backgrounds
    background: {
      default: palette.neutral[50],
      primary: palette.neutral[50],
      secondary: palette.neutral[100],
      tertiary: palette.neutral[200],
      paper: palette.neutral[0],
      subtle: palette.neutral[100],
      modal: 'rgba(0, 0, 0, 0.5)',
    },
    accent: {
      main: palette.primary[500],
      dark: palette.primary[700],
      soft: palette.primary[50],
    },
    text: {
      primary: palette.neutral[900],
      secondary: palette.neutral[600],
      tertiary: palette.neutral[400],
      inverse: palette.neutral[0],
      disabled: palette.neutral[300],
      muted: palette.neutral[400],
    },
    border: {
      light: palette.neutral[100],
      main: palette.neutral[200],
      dark: palette.neutral[300],
      focus: palette.primary[500],
    },
    status: {
      success: palette.success[600],
      successBg: palette.success[50],
      warning: palette.warning[600],
      warningBg: palette.warning[50],
      error: palette.error[600],
      errorBg: palette.error[50],
      info: palette.info[600],
      infoBg: palette.info[50],
      successLight: palette.success[50],
      warningLight: palette.warning[50],
      errorLight: palette.error[50],
      infoLight: palette.info[50],
    },
    gradients: {
      primary: [palette.primary[600], palette.primary[500]],
      secondary: [palette.secondary[600], palette.secondary[500]],
      doctorHeader: [palette.primary[700], palette.primary[600]],
      patientHeader: [palette.primary[600], palette.primary[500]],
      splash: [palette.primary[600], palette.primary[500]],
      auth: [palette.neutral[50], palette.neutral[100]],
      authBackground: [palette.neutral[50], palette.neutral[100]],
      subtle: [palette.neutral[50], palette.neutral[100]],
    },
  },

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  
  // v2: border radius mais arredondado e consistente
  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    full: 9999,
    pill: 9999,
    card: 20,
    button: 14,
    input: 12,
    modal: 20,
  },

  typography: {
    fontFamily: {
      regular: 'PlusJakartaSans_400Regular',
      medium: 'PlusJakartaSans_500Medium',
      semibold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
    },
    sizes: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, display: 32 },
    fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24 },
    fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    variants: {
      body: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      body2: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      bodySm: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      bodyLg: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      caption: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.25, fontWeight: '400' as const },
      overline: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, letterSpacing: 1.2, fontWeight: '600' as const },
      label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, fontWeight: '600' as const },
      h1: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.15, fontWeight: '700' as const },
      h2: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.2, fontWeight: '700' as const },
      h3: { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, fontWeight: '600' as const },
      title: { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, fontWeight: '600' as const },
      titleLg: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.2, fontWeight: '700' as const },
      display: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.1, fontWeight: '700' as const },
    },
  },

  opacity: { disabled: 0.5, overlay: 0.5, pressed: 0.7, hover: 0.8 },

  // v2: sombras mais elegantes e suaves
  shadows: {
    none: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    sm: { shadowColor: palette.neutral[900], shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
    md: { shadowColor: palette.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    lg: { shadowColor: palette.neutral[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    button: { shadowColor: palette.primary[600], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
    card: { shadowColor: palette.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    elevated: { shadowColor: palette.neutral[900], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
  },
  
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    toast: 1400,
    float: 1200,
    fixed: 1100,
  },
} as const;


// Legacy & Compatibility Exports
export const colors = {
  ...theme.colors,
  primary: theme.colors.primary.main, primaryLight: theme.colors.primary.light,
  primaryDark: theme.colors.primary.dark, primarySoft: theme.colors.primary.soft,
  primaryGhost: theme.colors.primary.ghost,
  secondary: theme.colors.secondary.main, secondaryLight: theme.colors.secondary.light,
  secondaryDark: theme.colors.secondary.dark, secondarySoft: theme.colors.secondary.soft,
  accent: theme.colors.accent.main, accentSoft: theme.colors.accent.soft,
  background: theme.colors.background.default, surface: theme.colors.background.paper,
  surfaceSecondary: theme.colors.background.subtle,
  text: theme.colors.text.primary, textSecondary: theme.colors.text.secondary,
  textMuted: theme.colors.text.tertiary,
  border: theme.colors.border.main, borderLight: theme.colors.border.light,
  white: palette.neutral[0], black: palette.neutral[950],
  success: theme.colors.status.success, successLight: theme.colors.status.successLight,
  warning: theme.colors.status.warning, warningLight: theme.colors.status.warningLight,
  error: theme.colors.status.error, errorLight: theme.colors.status.errorLight,
  info: theme.colors.status.info, infoLight: theme.colors.status.infoLight,
  destructive: palette.error[600], muted: palette.neutral[200],
  statusSubmitted: theme.colors.status.warning, statusInReview: theme.colors.status.info,
  statusApproved: theme.colors.status.success, statusPaid: theme.colors.status.success,
  statusSigned: theme.colors.text.secondary, statusDelivered: theme.colors.status.success,
  statusRejected: theme.colors.status.error, statusCancelled: theme.colors.text.tertiary,
  statusSearching: theme.colors.status.info, statusConsultationReady: theme.colors.status.info,
  statusInConsultation: theme.colors.status.warning, statusFinished: theme.colors.status.success,
  overlayBackground: 'rgba(0, 0, 0, 0.6)',
  headerOverlayTextMuted: 'rgba(255, 255, 255, 0.8)',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = theme.spacing;
export const borderRadius = theme.borderRadius;
export const typography = theme.typography;
export const shadows = theme.shadows;
export const gradients = theme.colors.gradients;

export default theme;
