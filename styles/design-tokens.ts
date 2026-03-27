/**
 * TekkiPro Design Tokens
 * Modern West African aesthetic — terracotta · gold · forest green
 *
 * Source of truth for both the React web dashboard and the React Native mobile app.
 * Tokens extracted from the established TP palette in DashboardScreen.js.
 */

// ─── Brand Palette ────────────────────────────────────────────────────────────

export const COLOR = {
  // Terracotta — primary brand color
  terracotta:      '#E8623A',
  terracottaDark:  '#C44A25',
  terracottaDeep:  '#A33418',
  terracottaLight: '#FFF0EB',
  terracottaMid:   '#FDDDD3',
  terracottaGlow:  'rgba(232, 98, 58, 0.14)',

  // Gold — secondary accent
  gold:            '#F4A020',
  goldDark:        '#D4880F',
  goldDeep:        '#B36D00',
  goldLight:       '#FFF6E5',
  goldMid:         '#FFE4A8',
  goldGlow:        'rgba(244, 160, 32, 0.14)',

  // Forest Green — success / positive
  green:           '#1B6B3A',
  greenDark:       '#155230',
  greenDeep:       '#0D3D22',
  greenLight:      '#E8F5ED',
  greenMid:        '#B8DFC7',
  greenGlow:       'rgba(27, 107, 58, 0.14)',

  // Semantic
  danger:          '#DC2626',
  dangerLight:     '#FEE2E2',
  dangerMid:       '#FECACA',
  warning:         '#F59E0B',
  warningLight:    '#FEF3C7',
  info:            '#0284C7',
  infoLight:       '#E0F2FE',

  // Neutral (warm-tinted)
  white:           '#FFFFFF',
  gray50:          '#F8F6F3',
  gray100:         '#F0EDE8',
  gray200:         '#E5E0D8',
  gray300:         '#C9C1B8',
  gray400:         '#9C8F85',
  gray500:         '#7B6E65',
  gray600:         '#5C524A',
  gray700:         '#3D3530',
  gray800:         '#2A211C',
  gray900:         '#1A1A2E',

  // Surface
  surface:         '#FFFFFF',
  surfaceMuted:    '#FAF8F5',
  border:          'rgba(201, 193, 184, 0.32)',
  borderStrong:    'rgba(156, 143, 133, 0.40)',
} as const;

// ─── Dark Theme Palette ────────────────────────────────────────────────────────

export const DARK = {
  background:    '#110F0C',
  headerBg:      '#1A1510',
  cardBg:        '#1E1914',
  cardBorder:    'rgba(255, 200, 150, 0.10)',
  surfaceBg:     'rgba(255, 255, 255, 0.05)',
  surfaceBorder: 'rgba(255, 200, 150, 0.12)',
  accentBg:      'rgba(232, 98, 58, 0.22)',
  accentText:    '#FF9B77',
  text:          '#F8F6F3',
  muted:         '#A89C94',
  faint:         '#7A7068',
} as const;

// ─── Typography ────────────────────────────────────────────────────────────────

export const FONT = {
  family: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
  familyMono: "'JetBrains Mono', 'Fira Code', monospace",

  // Weights
  light:    300,
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
  extrabold: 800,

  // Sizes (rem)
  xs:   '0.68rem',   //  ~10.9px
  sm:   '0.76rem',   //  ~12.2px
  base: '0.88rem',   //  ~14.1px
  md:   '0.95rem',   //  ~15.2px
  lg:   '1.05rem',   //  ~16.8px
  xl:   '1.25rem',   //  ~20px
  '2xl': '1.55rem',  //  ~24.8px
  '3xl': '1.85rem',  //  ~29.6px
  '4xl': '2.2rem',   //  ~35.2px
  '5xl': '2.8rem',   //  ~44.8px

  // Line heights
  tight:   1.2,
  snug:    1.35,
  normal:  1.6,
  relaxed: 1.75,
} as const;

// ─── Border Radius ─────────────────────────────────────────────────────────────

export const RADIUS = {
  xs:   '0.5rem',    //  8px
  sm:   '0.75rem',   // 12px
  md:   '1rem',      // 16px
  lg:   '1.25rem',   // 20px
  xl:   '1.5rem',    // 24px
  '2xl': '1.875rem', // 30px
  full: '999px',
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────────────

export const SHADOW = {
  sm:   '0 1px 2px rgba(26, 26, 46, 0.04), 0 1px 3px rgba(26, 26, 46, 0.06)',
  md:   '0 10px 28px rgba(26, 26, 46, 0.08), 0 2px 8px rgba(26, 26, 46, 0.04)',
  lg:   '0 18px 48px rgba(26, 26, 46, 0.10), 0 6px 20px rgba(26, 26, 46, 0.05)',
  xl:   '0 28px 70px rgba(26, 26, 46, 0.14), 0 10px 30px rgba(26, 26, 46, 0.08)',
  glowTerracotta: '0 0 0 1px rgba(232, 98, 58, 0.08), 0 14px 34px rgba(232, 98, 58, 0.18)',
  glowGold:       '0 0 0 1px rgba(244, 160, 32, 0.10), 0 10px 28px rgba(244, 160, 32, 0.16)',
  glowGreen:      '0 0 0 1px rgba(27, 107, 58, 0.08), 0 10px 28px rgba(27, 107, 58, 0.14)',
  inner:          'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────────────

export const SPACE = {
  1:  '0.25rem',   //  4px
  2:  '0.5rem',    //  8px
  3:  '0.75rem',   // 12px
  4:  '1rem',      // 16px
  5:  '1.25rem',   // 20px
  6:  '1.5rem',    // 24px
  7:  '1.75rem',   // 28px
  8:  '2rem',      // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
} as const;

// ─── Layout ────────────────────────────────────────────────────────────────────

export const LAYOUT = {
  sidebarWidth:         '288px',
  sidebarCollapsedWidth: '88px',
  contentMaxWidth:      '1480px',
  headerHeight:         '68px',
} as const;

// ─── Animation ─────────────────────────────────────────────────────────────────

export const EASE = {
  default:  'cubic-bezier(0.4, 0, 0.2, 1)',
  in:       'cubic-bezier(0.4, 0, 1, 1)',
  out:      'cubic-bezier(0, 0, 0.2, 1)',
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  duration: {
    fast:   '0.15s',
    base:   '0.25s',
    slow:   '0.35s',
  },
} as const;

// ─── CSS Custom Properties (inject into :root) ─────────────────────────────────
// Kept as a flat map so they can be rendered with Object.entries()

export const CSS_VARS: Record<string, string> = {
  // Primary — Terracotta
  '--primary':          COLOR.terracotta,
  '--primary-dark':     COLOR.terracottaDark,
  '--primary-deep':     COLOR.terracottaDeep,
  '--primary-light':    COLOR.terracottaLight,
  '--primary-mid':      COLOR.terracottaMid,
  '--primary-glow':     COLOR.terracottaGlow,

  // Secondary — Gold
  '--secondary':        COLOR.gold,
  '--secondary-dark':   COLOR.goldDark,
  '--secondary-light':  COLOR.goldLight,
  '--secondary-mid':    COLOR.goldMid,
  '--secondary-glow':   COLOR.goldGlow,

  // Accent — Forest Green
  '--accent':           COLOR.green,
  '--accent-dark':      COLOR.greenDark,
  '--accent-light':     COLOR.greenLight,
  '--accent-mid':       COLOR.greenMid,
  '--accent-glow':      COLOR.greenGlow,

  // Semantic
  '--danger':           COLOR.danger,
  '--danger-light':     COLOR.dangerLight,
  '--warning':          COLOR.warning,
  '--warning-light':    COLOR.warningLight,
  '--info':             COLOR.info,
  '--info-light':       COLOR.infoLight,

  // Neutral
  '--gray-50':          COLOR.gray50,
  '--gray-100':         COLOR.gray100,
  '--gray-200':         COLOR.gray200,
  '--gray-300':         COLOR.gray300,
  '--gray-400':         COLOR.gray400,
  '--gray-500':         COLOR.gray500,
  '--gray-600':         COLOR.gray600,
  '--gray-700':         COLOR.gray700,
  '--gray-800':         COLOR.gray800,
  '--gray-900':         COLOR.gray900,

  // Surface
  '--surface':          COLOR.surface,
  '--surface-muted':    COLOR.surfaceMuted,
  '--border-color':     COLOR.border,

  // Layout
  '--sidebar-width':            LAYOUT.sidebarWidth,
  '--sidebar-collapsed-width':  LAYOUT.sidebarCollapsedWidth,

  // Radius
  '--radius-xs':    RADIUS.xs,
  '--radius-sm':    RADIUS.sm,
  '--radius-md':    RADIUS.md,
  '--radius-lg':    RADIUS.lg,
  '--radius-xl':    RADIUS.xl,
  '--radius-2xl':   RADIUS['2xl'],

  // Shadows
  '--shadow-sm':    SHADOW.sm,
  '--shadow-md':    SHADOW.md,
  '--shadow-lg':    SHADOW.lg,
  '--shadow-xl':    SHADOW.xl,
  '--shadow-glow':  SHADOW.glowTerracotta,
};

// ─── React Native StyleSheet tokens ────────────────────────────────────────────
// Use these directly in RN StyleSheet.create() objects

export const RN = {
  color: COLOR,
  dark: DARK,
  font: FONT,
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    full: 999,
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
  },
  shadow: {
    sm: { shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,  elevation: 2 },
    md: { shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 6 },
    lg: { shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 12 },
  },
} as const;
