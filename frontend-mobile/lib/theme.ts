import { Platform } from 'react-native';

/**
 * RenoveJá+ Design System - Unified Theme
 * Supports Light & Dark modes via semantic tokens.
 */

// -----------------------------------------------------------------------------
// 1. Primitive Colors (Palette)
// -----------------------------------------------------------------------------
const palette = {
  // Brand / Primary (Blue)
  primary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Main Brand
    600: '#0284C7', // Hover/Active
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },
  // Secondary / Success (Green/Teal for Medical)
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
    950: '#042F2E',
  },
  // Neutral (Slate/Gray)
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  // Semantic Status
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E', // Standard Green
    600: '#16A34A',
    700: '#15803D',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
} as const;

// -----------------------------------------------------------------------------
// 2. Semantic Tokens (Theme)
// -----------------------------------------------------------------------------
export const theme = {
  colors: {
    // Brand
    primary: {
      main: palette.primary[600], // #0284C7
      light: palette.primary[500],
      dark: palette.primary[700],
      soft: palette.primary[50],
      contrast: palette.neutral[0],
      ghost: palette.primary[50], // Legacy alias
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

    // Typography
    text: {
      primary: palette.neutral[900],
      secondary: palette.neutral[600],
      tertiary: palette.neutral[400],
      inverse: palette.neutral[0],
      disabled: palette.neutral[300],
      muted: palette.neutral[400], // Legacy alias
    },

    // Borders
    border: {
      light: palette.neutral[100],
      main: palette.neutral[200],
      dark: palette.neutral[300],
      focus: palette.primary[500],
    },

    // Status (Feedback)
    status: {
      success: palette.success[600],
      successBg: palette.success[50],
      warning: palette.warning[600],
      warningBg: palette.warning[50],
      error: palette.error[600],
      errorBg: palette.error[50],
      info: palette.info[600],
      infoBg: palette.info[50],
      // Flattened for compatibility
      successLight: palette.success[50],
      warningLight: palette.warning[50],
      errorLight: palette.error[50],
      infoLight: palette.info[50],
    },

    // Gradients
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

  // ---------------------------------------------------------------------------
  // 3. Spacing & Layout (8pt Grid System)
  // ---------------------------------------------------------------------------
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
    pill: 9999,
    card: 16,
    button: 12,
    input: 8,
    modal: 16,
  },

  // ---------------------------------------------------------------------------
  // 4. Typography Scale (Plus Jakarta Sans)
  // ---------------------------------------------------------------------------
  typography: {
    fontFamily: {
      regular: 'PlusJakartaSans_400Regular',
      medium: 'PlusJakartaSans_500Medium',
      semibold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      display: 32,
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    variants: {
      body: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      body2: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      bodySm: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      bodyLg: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.5, fontWeight: '400' as const },
      caption: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 1.25, fontWeight: '400' as const },
      overline: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, letterSpacing: 1, fontWeight: '600' as const },
      label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, fontWeight: '600' as const },
      h1: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.2, fontWeight: '700' as const },
      h2: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.25, fontWeight: '700' as const },
      h3: { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, fontWeight: '600' as const },
      title: { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 1.25, fontWeight: '600' as const },
      titleLg: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.2, fontWeight: '700' as const },
      display: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 1.2, fontWeight: '700' as const },
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Opacity
  // ---------------------------------------------------------------------------
  opacity: {
    disabled: 0.5,
    overlay: 0.5,
    pressed: 0.7,
    hover: 0.8,
  },

  // ---------------------------------------------------------------------------
  // 6. Shadows
  // ---------------------------------------------------------------------------
  shadows: {
    none: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: palette.neutral[900],
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: palette.neutral[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: { 
      shadowColor: palette.neutral[900],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 5,
    },
    button: {
      shadowColor: palette.primary[600],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    card: {
      shadowColor: palette.neutral[900],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 5,
    },
    elevated: {
      shadowColor: palette.neutral[900],
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  // Legacy Z-Index (Restored)
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


// -----------------------------------------------------------------------------
// Legacy & Compatibility Exports (Bridge pattern)
// -----------------------------------------------------------------------------

export const colors = {
  ...theme.colors,
  // Flat Colors
  primary: theme.colors.primary.main,
  primaryLight: theme.colors.primary.light,
  primaryDark: theme.colors.primary.dark,
  primarySoft: theme.colors.primary.soft,
  primaryGhost: theme.colors.primary.ghost,
  
  secondary: theme.colors.secondary.main,
  secondaryLight: theme.colors.secondary.light,
  secondaryDark: theme.colors.secondary.dark,
  secondarySoft: theme.colors.secondary.soft, // Restored

  accent: theme.colors.accent.main,
  accentSoft: theme.colors.accent.soft, // Restored

  background: theme.colors.background.default,
  surface: theme.colors.background.paper,
  surfaceSecondary: theme.colors.background.subtle,
  
  text: theme.colors.text.primary,
  textSecondary: theme.colors.text.secondary,
  textMuted: theme.colors.text.tertiary,
  
  border: theme.colors.border.main,
  borderLight: theme.colors.border.light,
  
  white: palette.neutral[0], // Restored
  black: palette.neutral[950], // Restored
  
  // Status Aliases
  success: theme.colors.status.success,
  successLight: theme.colors.status.successLight, // Restored
  warning: theme.colors.status.warning,
  warningLight: theme.colors.status.warningLight, // Restored
  error: theme.colors.status.error,
  errorLight: theme.colors.status.errorLight, // Restored
  info: theme.colors.status.info,
  infoLight: theme.colors.status.infoLight, // Restored
  destructive: palette.error[600],
  muted: palette.neutral[200],

  statusSubmitted: theme.colors.status.warning,
  statusInReview: theme.colors.status.info,
  statusApproved: theme.colors.status.success,
  statusPaid: theme.colors.status.success,
  statusSigned: theme.colors.text.secondary,
  statusDelivered: theme.colors.status.success,
  statusRejected: theme.colors.status.error,
  statusCancelled: theme.colors.text.tertiary,
  statusSearching: theme.colors.status.info,
  statusConsultationReady: theme.colors.status.info,
  statusInConsultation: theme.colors.status.warning,
  statusFinished: theme.colors.status.success,

  // UI Overlays (Missing tokens restoration)
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
