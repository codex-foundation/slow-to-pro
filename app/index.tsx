import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { appStorage } from '@/utils/mmkv';

const HAS_SEEN_WELCOME_KEY = 'has-seen-welcome-v1';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  useEffect(() => {
    const hasSeenWelcome = appStorage.getItem(HAS_SEEN_WELCOME_KEY) === 'true';
    if (hasSeenWelcome) {
      router.replace('/(tabs)/tasks');
    }
  }, [router]);

  const handleGetStarted = () => {
    appStorage.setItem(HAS_SEEN_WELCOME_KEY, 'true');
    router.replace('/(tabs)/tasks');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.primary }]}>Slow to Pro</Text>
        <View style={styles.subtitleRow}>
          <Text style={[styles.subtitle, { color: theme.textSubtle }]}>Welcome</Text>
          <Ionicons
            testID="welcome-wave-icon"
            name="hand-left-outline"
            size={20}
            color={theme.textSubtle}
            style={styles.subtitleIcon}
          />
          <Text style={[styles.subtitle, { color: theme.textSubtle }]}>
            Let’s turn consistent daily effort into real progress.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleGetStarted}
          style={[styles.button, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Get started">
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitleIcon: {
    marginHorizontal: 6,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
