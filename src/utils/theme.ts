import type { ColorSchemeName } from 'react-native';

export interface AppTheme {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primarySoft: string;
  danger: string;
  success: string;
  overlay: string;
}

const lightTheme: AppTheme = {
  isDark: false,
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceMuted: '#f3f4f6',
  border: '#e5e7eb',
  text: '#0f172a',
  textMuted: '#334155',
  textSubtle: '#64748b',
  primary: '#2563eb',
  primarySoft: '#dbeafe',
  danger: '#ef4444',
  success: '#10b981',
  overlay: 'rgba(2, 6, 23, 0.45)',
};

const darkTheme: AppTheme = {
  isDark: true,
  bg: '#020617',
  surface: '#0b1220',
  surfaceElevated: '#111827',
  surfaceMuted: '#1f2937',
  border: '#273244',
  text: '#e5e7eb',
  textMuted: '#cbd5e1',
  textSubtle: '#94a3b8',
  primary: '#60a5fa',
  primarySoft: '#1e3a8a',
  danger: '#f87171',
  success: '#34d399',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export function getTheme(scheme: ColorSchemeName): AppTheme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
