/**
 * WAMC Student Attendance App - Light Modern College Design System Tokens
 */

export const Colors = {
  // ─── Primary College Blue Palette ──────────────────────────────────────────
  primary: '#2563EB',        // Main primary action / buttons / highlights
  primaryDark: '#1D4ED8',    // Active / pressed primary state
  primaryLight: '#EFF6FF',   // Subtle light blue background / tint
  primaryContainer: '#DBEAFE', // Soft container for badges/icons

  // ─── Surface & Background (Clean Light Theme) ──────────────────────────────
  background: '#F8FAFC',     // Main screen background
  surface: '#FFFFFF',        // Cards, modals, containers
  card: '#FFFFFF',           // Card background
  cardHover: '#F1F5F9',      // Subtle press / hover

  // ─── Typography Colors ─────────────────────────────────────────────────────
  text: '#1E293B',           // High-contrast primary text
  textSecondary: '#64748B',  // Muted secondary / subtitle text
  textTertiary: '#94A3B8',   // Placeholder / disabled text
  textInverse: '#FFFFFF',    // Text on primary buttons

  // ─── Borders & Dividers ────────────────────────────────────────────────────
  border: '#E2E8F0',         // Card borders & input outlines
  borderLight: '#F1F5F9',    // Subtle separators
  borderDark: '#CBD5E1',     // Focused input border

  // ─── Status & Semantic Colors ──────────────────────────────────────────────
  success: '#16A34A',        // Green - Present / active / success
  successLight: '#DCFCE7',   // Light green pill badge bg
  warning: '#D97706',        // Amber - Under review / warning
  warningLight: '#FEF3C7',   // Light amber pill badge bg
  error: '#DC2626',          // Red - Absent / rejected / error
  errorLight: '#FEE2E2',     // Light red pill badge bg
  info: '#0284C7',           // Blue - Info announcements
  infoLight: '#E0F2FE',      // Light blue pill badge bg

  // ─── Compatibility Aliases (to prevent breaking legacy screen imports) ─────
  onSurface: '#1E293B',
  onSurfaceVariant: '#64748B',
  outline: '#E2E8F0',
  surfaceVariant: '#F1F5F9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainer: '#FFFFFF',
  surfaceContainerLow: '#FFFFFF',
  surfaceContainerHigh: '#E2E8F0',
  secondaryContainer: '#E2E8F0',
  onSecondaryContainer: '#1E293B',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#991B1B',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1E3A8A',
  secondary: '#64748B',
  onSecondary: '#FFFFFF',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Typography = {
  screenTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  secondary: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
};

export const Shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default Colors;
