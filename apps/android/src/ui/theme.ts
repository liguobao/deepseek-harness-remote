export const colors = {
  background: '#FFFFFF',
  surface: '#F6F7F4',
  surfaceStrong: '#EAEEE6',
  ink: '#272C22',
  muted: '#636A5C',
  subtle: '#6F7669',
  primary: '#3E4B28',
  primaryPressed: '#303B20',
  primarySoft: '#E8EDDE',
  accent: '#176F9F',
  accentSoft: '#E2F1F8',
  success: '#276A3C',
  successSoft: '#E2F2E7',
  warning: '#825306',
  warningSoft: '#FAEDCC',
  danger: '#A73A32',
  dangerSoft: '#F9E5E2',
  border: '#DCE1D8',
  separator: '#E9ECE6',
  disabled: '#AFB5A9',
  white: '#FFFFFF',
  scrim: 'rgba(20, 24, 18, 0.36)',
} as const

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const

export const type = {
  hero: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const
