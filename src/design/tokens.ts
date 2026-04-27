import type { AppTheme } from '@/utils/theme';

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const type = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.8, lineHeight: 38 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' as const },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  mono: { fontVariant: ['tabular-nums' as const] },
};

export function shadow(theme: AppTheme) {
  return {
    shadowColor: theme.isDark ? '#000' : '#0f172a',
    shadowOpacity: theme.isDark ? 0.4 : 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  };
}
