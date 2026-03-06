import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { type ThemePreference, useSettingsStore } from '@/stores/settingsStore';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const theme = useAppTheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const currentYear = new Date().getFullYear();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          Settings
        </Text>
      </View>

      <View className="px-4 mt-4">
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.border,
            borderWidth: 1,
          }}>
          <Text className="text-sm font-semibold" style={{ color: theme.textMuted }}>
            Theme
          </Text>
          <Text className="text-xs mt-1 mb-3" style={{ color: theme.textSubtle }}>
            Choose your preferred appearance.
          </Text>

          <View className="flex-row gap-2">
            {THEME_OPTIONS.map((option) => {
              const active = themePreference === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => setThemePreference(option)}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                    borderWidth: 1,
                  }}>
                  <Text
                    className="text-sm font-medium capitalize"
                    style={{ color: active ? '#fff' : theme.textMuted }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View className="px-4 mt-4">
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.border,
            borderWidth: 1,
          }}>
          <Text className="text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>
            About
          </Text>

          <View className="flex-row justify-between py-1">
            <Text className="text-sm" style={{ color: theme.textSubtle }}>
              App Version
            </Text>
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              {appVersion}
            </Text>
          </View>

          <View className="h-px my-2" style={{ backgroundColor: theme.border }} />

          <Text className="text-sm" style={{ color: theme.textSubtle }}>
            © {currentYear} slow-to-pro. All rights reserved.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
