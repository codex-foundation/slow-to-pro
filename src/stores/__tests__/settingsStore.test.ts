import { useSettingsStore } from '../../stores/settingsStore';

beforeEach(() => {
  useSettingsStore.setState({ themePreference: 'system' });
});

describe('settingsStore', () => {
  it('has correct initial themePreference', () => {
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });

  it('setThemePreference updates the preference to light', () => {
    useSettingsStore.getState().setThemePreference('light');
    expect(useSettingsStore.getState().themePreference).toBe('light');
  });

  it('setThemePreference updates the preference to dark', () => {
    useSettingsStore.getState().setThemePreference('dark');
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });

  it('setThemePreference can reset back to system', () => {
    useSettingsStore.getState().setThemePreference('dark');
    useSettingsStore.getState().setThemePreference('system');
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });
});
