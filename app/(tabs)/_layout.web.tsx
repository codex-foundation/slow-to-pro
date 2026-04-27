import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { Halo } from '@/design';
import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { appStorage } from '@/utils/mmkv';

const TC_ACCEPTED_KEY = 'tc-accepted-v1';

const NAV_ITEMS = [
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

export default function WebTabLayout() {
  const theme = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const guard = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (appStorage.getItem(TC_ACCEPTED_KEY) !== 'true') {
          router.replace('/');
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace('/');
          return;
        }
      }
      setAuthChecked(true);
    };
    void guard();
  }, [router]);

  const isActive = (key: string) =>
    pathname === `/${key}` || pathname === `/(tabs)/${key}` || pathname.endsWith(`/${key}`);

  if (!authChecked) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.bg,
        }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.bg }}>
      <View
        style={{
          width: 240,
          backgroundColor: theme.surfaceElevated,
          borderRightWidth: 1,
          borderRightColor: theme.border,
          paddingTop: 28,
          paddingHorizontal: 14,
          overflow: 'hidden',
        }}>
        <Halo size={280} top={-120} left={-80} opacity={theme.isDark ? 0.18 : 0.1} />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 8,
            paddingBottom: 22,
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primarySoft,
            }}>
            <Ionicons name="timer-outline" size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>Slow to Pro</Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: theme.textSubtle,
              }}>
              Focus, not noise
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: theme.textSubtle,
            paddingHorizontal: 10,
            marginBottom: 6,
          }}>
          Workspace
        </Text>

        {NAV_ITEMS.map((item) => {
          const active = isActive(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.replace(item.href)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 11,
                borderRadius: 14,
                marginBottom: 4,
                backgroundColor: active ? theme.primarySoft : 'transparent',
                borderWidth: 1,
                borderColor: active ? `${theme.primary}22` : 'transparent',
              }}>
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? theme.primary : theme.textSubtle}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: active ? '600' : '500',
                  color: active ? theme.primary : theme.textMuted,
                }}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
