export const colors = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceStrong: '#F0F2F5',
  ink: '#1D1D1F',
  muted: '#5F636B',
  subtle: '#70757D',
  primary: '#1677FF',
  primaryPressed: '#0958D9',
  primarySoft: '#E8F3FF',
  accent: '#1677FF',
  accentSoft: '#E8F3FF',
  success: '#276A3C',
  successSoft: '#E2F2E7',
  warning: '#825306',
  warningSoft: '#FAEDCC',
  danger: '#A73A32',
  dangerSoft: '#F9E5E2',
  border: '#D9E2EC',
  separator: '#E8E8ED',
  disabled: '#A7ABB3',
  white: '#FFFFFF',
  scrim: 'rgba(23, 24, 29, 0.42)',
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
