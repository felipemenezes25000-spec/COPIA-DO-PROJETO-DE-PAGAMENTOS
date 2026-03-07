/**
 * RenoveJá+ Unified Design System (Dark Mode Enhanced)
 * Factory `createTokens(role, scheme)` — única fonte de verdade de tokens.
 */

import { theme } from './theme';

export type ColorScheme = 'light' | 'dark';
export type AppRole = 'patient' | 'doctor';

// ─── Paletas Base (Brand) ──────────────
const BRAND = {
  primary: '#2CB1FF',
  primaryLight: '#5EC5FF',
  primaryDark: '#1A9DE0',
  secondary: '#10B981',
  secondaryDark: '#059669',
  accent: '#8B5CF6',
  white: '#FFFFFF',
  black: '#0F172A',
};

// ─── Semantic light ───────────────────────────────────────────
const PATIENT_LIGHT = {
  overlayBackground: 'rgba(0,0,0,0.45)',
  modalOverlay: 'rgba(0,0,0,0.7)',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  primarySoft: '#E3F4FF',
  primaryGhost: 'rgba(44,177,255,0.08)',
  
  // Status Backgrounds (Light)
  successLight: '#D1FAE5',
  warningLight: '#FEF3C7',
  errorLight: '#FEE2E2',
  infoLight: '#DBEAFE',
  
  // Status Text
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// ─── Semantic dark (Refined) ──────────────────────────────────
const PATIENT_DARK = {
  overlayBackground: 'rgba(0,0,0,0.7)',
  modalOverlay: 'rgba(0,0,0,0.85)',
  background: '#0F172A', // Slate 900
  surface: '#1E293B',    // Slate 800 - Card Surface
  surfaceSecondary: '#334155', // Slate 700
  text: '#F8FAFC',       // Slate 50
  textSecondary: '#CBD5E1', // Slate 300
  textMuted: '#94A3B8',  // Slate 400
  border: '#334155',     // Slate 700
  borderLight: '#1E293B',
  primarySoft: '#1e3a8a', // Blue 900 (Deep Blue)
  primaryGhost: 'rgba(44,177,255,0.15)',

  // Status Backgrounds (Dark - Muted)
  successLight: '#064E3B', // Emerald 900
  warningLight: '#451A03', // Amber 900
  errorLight: '#450A0A',   // Red 900
  infoLight: '#172554',    // Blue 950
  
  // Status Text (Light on Dark)
  success: '#34D399',      // Emerald 400
  warning: '#FBBF24',      // Amber 400
  error: '#F87171',        // Red 400
  info: '#60A5FA',         // Blue 400
};

// ─── Doctor Theme (Dark Mode) ────────────────────────────────
const DOCTOR_DARK = {
  ...PATIENT_DARK,
  background: '#0B1120', // Even darker for professional feel
  surface: '#15202E',    // Cool Gray
  muted: '#1E293B',
  primarySoft: '#172554',
  ring: '#3B82F6',
};

// ─── Gradients (ajustados para dark) ─────────────────────────
function getGradients(scheme: ColorScheme) {
  const isDark = scheme === 'dark';
  return {
    auth: theme.colors.gradients.authBackground as unknown as string[],
    splash: theme.colors.gradients.splash as unknown as string[],
    doctorHeader: isDark ? ['#0F172A', '#1E293B'] : ['#1A9DE0', '#2CB1FF'],
    patientHeader: isDark ? ['#0F172A', '#1E293B'] : ['#1A9DE0', '#2CB1FF', '#5EC5FF'],
    primary: theme.colors.gradients.primary as unknown as string[],
    secondary: theme.colors.gradients.secondary as unknown as string[],
  };
}

// ─── Header overlay (texto sobre gradiente azul — sempre claro) ───
const HEADER_OVERLAY = {
  headerOverlayText: '#FFFFFF',
  headerOverlayTextMuted: 'rgba(255,255,255,0.85)',
  headerOverlayBorder: 'rgba(255,255,255,0.4)',
  headerOverlaySurface: 'rgba(255,255,255,0.25)',
};

// ─── Factory ─────────────────────────────────────────────────
export function createTokens(role: AppRole, scheme: ColorScheme) {
  const isDoctor = role === 'doctor';
  const isDark = scheme === 'dark';
  
  const base = isDoctor
    ? (isDark ? DOCTOR_DARK : PATIENT_LIGHT) // Doctor uses similar light theme
    : (isDark ? PATIENT_DARK : PATIENT_LIGHT);

  const colors = {
    ...BRAND,
    ...base,
    ...HEADER_OVERLAY,
    white: BRAND.white,
    black: BRAND.black,
    destructive: isDark ? '#F87171' : '#DC2626', // Lighter red in dark mode
    
    // Status Aliases (Flat)
    statusSubmitted: base.warning,
    statusInReview: base.info,
    statusApproved: base.success,
    statusPaid: base.success,
    statusSigned: base.textSecondary,
    statusDelivered: base.success,
    statusRejected: base.error,
    statusCancelled: base.textMuted,
    statusSearching: base.warning,
    statusConsultationReady: base.info,
    statusInConsultation: base.warning,
    statusFinished: base.success,
    
    // Legacy mapping
    muted: (base as any).muted || base.surfaceSecondary,
    
    secondarySoft: isDoctor && isDark ? '#3A2010' : '#FFF3E6',
    accentSoft: isDark ? '#2E1065' : '#EDE9FE',
  };

  const borderRadius = {
    xs: theme.borderRadius.xs,
    sm: theme.borderRadius.sm,
    md: theme.borderRadius.md,
    lg: theme.borderRadius.lg,
    xl: theme.borderRadius.xl,
    pill: theme.borderRadius.pill,
    card: theme.borderRadius.card,
    full: theme.borderRadius.full,
    button: theme.borderRadius.button,
    input: theme.borderRadius.input,
    modal: theme.borderRadius.modal,
  };

  return {
    role,
    scheme,
    colors,
    gradients: getGradients(scheme),
    spacing: theme.spacing,
    borderRadius,
    radius: borderRadius,
    shadows: theme.shadows,
    typography: theme.typography,
  };
}

/** Tokens estáticos light — compatibilidade com imports diretos de lib/theme e lib/themeDoctor */
export const patientTokens = createTokens('patient', 'light');
export const doctorTokens = createTokens('doctor', 'light');

export type DesignTokens = ReturnType<typeof createTokens>;
export type DesignColors = DesignTokens['colors'];
