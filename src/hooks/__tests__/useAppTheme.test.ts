import { renderHook } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '../useAppTheme';

describe('useAppTheme', () => {
  beforeEach(() => {
    useSettingsStore.setState({ themePreference: 'system' });
    jest.restoreAllMocks();
  });

  it('uses system scheme when preference is system', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { result } = renderHook(() => useAppTheme());

    expect(result.current.isDark).toBe(true);
  });

  it('forces light theme regardless of system scheme', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    useSettingsStore.setState({ themePreference: 'light' });

    const { result } = renderHook(() => useAppTheme());

    expect(result.current.isDark).toBe(false);
  });

  it('forces dark theme regardless of system scheme', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    useSettingsStore.setState({ themePreference: 'dark' });

    const { result } = renderHook(() => useAppTheme());

    expect(result.current.isDark).toBe(true);
  });
});
