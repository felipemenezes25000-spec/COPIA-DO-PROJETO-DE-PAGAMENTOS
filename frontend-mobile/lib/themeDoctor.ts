/**
 * RenoveJá+ Doctor Theme (Wrapper)
 * Extends & specializations for Doctor UI, inheriting base theme tokens.
 * 
 * DESIGN SYSTEM UPDATE:
 * - Removed duplicated hardcoded hex values.
 * - Now references lib/theme.ts for single source of truth.
 * - Ensures Dark Mode compatibility by using semantic tokens.
 */

import { theme, colors as baseColors, spacing as baseSpacing, shadows as baseShadows, borderRadius as baseBorderRadius } from './theme';

// Doctor-Specific Overrides (Professional Blue / Clean White)
export const colors = {
  ...baseColors,
  
  // Doctor Primary = Deep Blue (Trust)
  primary: theme.colors.primary.dark, // 700 series
  primaryLight: theme.colors.primary.light,
  primaryGhost: theme.colors.primary.soft,
  primarySoft: theme.colors.primary.soft,
  
  // Backgrounds
  background: theme.colors.background.default, // Light Gray
  surface: theme.colors.background.paper,      // White Cards
  surfaceSecondary: theme.colors.background.subtle,

  // Text
  text: theme.colors.text.primary,
  textSecondary: theme.colors.text.secondary,
  textMuted: theme.colors.text.tertiary, // Ensure WCAG AA
  
  // Status (Semantic)
  statusSubmitted: theme.colors.status.warning,     // Amber
  statusInReview: theme.colors.status.info,         // Blue
  statusApproved: theme.colors.status.success,      // Green
  statusPaid: theme.colors.status.success,          // Green
  statusSigned: theme.colors.text.secondary,        // Gray (Done)
  statusDelivered: theme.colors.status.success,     // Green
  statusRejected: theme.colors.status.error,        // Red
  statusCancelled: theme.colors.text.tertiary,      // Muted
  statusSearching: theme.colors.status.info,        // Blue spinner
  statusConsultationReady: theme.colors.status.info,// Blue
  statusInConsultation: theme.colors.status.warning,// Amber (Active)
  statusFinished: theme.colors.status.success,      // Green
  muted: theme.colors.background.tertiary,
};

export const spacing = baseSpacing;

export const borderRadius = {
  ...baseBorderRadius,
  // Specific override for card radius consistency
  card: 16, 
  button: 12,
};

export const doctorDS = {
  cardRadius: 16,
  cardPadding: 16, // Standardized padding
  sectionGap: 24,
  buttonHeight: 48, // Standard touch target
  buttonRadius: 12,
  screenPaddingHorizontal: 20, // Clean gutters
} as const;

export const shadows = baseShadows;

export const gradients = {
  doctorHeader: theme.colors.gradients.doctorHeader,
  primary: theme.colors.gradients.primary,
  subtle: theme.colors.gradients.subtle,
};

export const typography = theme.typography;
