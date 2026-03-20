import Constants from 'expo-constants';
import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';

export default function TabLayout() {
  const isExpoGo = Constants.appOwnership === 'expo';
  const theme = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabItems = [
    {
      key: 'tasks',
      title: 'Tasks',
      icon: 'checkmark-done-outline' as const,
      href: '/(tabs)/tasks',
    },
    { key: 'pomodoro', title: 'Focus', icon: 'timer-outline' as const, href: '/(tabs)/pomodoro' },
    {
      key: 'finances',
      title: 'Money',
      icon: 'wallet-outline' as const,
      href: '/(tabs)/finances',
    },
    {
      key: 'settings',
      title: 'Settings',
      icon: 'settings-outline' as const,
      href: '/(tabs)/settings',
    },
  ];

  const isActive = (key: string) =>
    pathname === `/${key}` || pathname === `/(tabs)/${key}` || pathname.endsWith(`/${key}`);

  if (isExpoGo) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.bg }}>
        <View className="flex-1">
          <Slot />
        </View>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.surfaceElevated,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
            paddingHorizontal: 8,
          }}>
          <View className="flex-row items-center justify-between">
            {tabItems.map((tab) => {
              const active = isActive(tab.key);
              const color = active ? theme.primary : theme.textSubtle;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => router.replace(tab.href)}
                  className="flex-1 items-center py-1"
                  accessibilityRole="button"
                  accessibilityLabel={tab.title}>
                  <Ionicons name={tab.icon} size={20} color={color} />
                  <Text className="text-xs mt-0.5" style={{ color }}>
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarStyle: {
          borderTopColor: theme.border,
          backgroundColor: theme.surfaceElevated,
        },
      }}>
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
