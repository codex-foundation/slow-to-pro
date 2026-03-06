import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/stores/settingsStore';
import { getTheme } from '@/utils/theme';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const resolvedScheme = themePreference === 'system' ? systemScheme : themePreference;

  return getTheme(resolvedScheme);
}
