import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appStorage } from '@/utils/mmkv';

const HAS_SEEN_WELCOME_KEY = 'has-seen-welcome-v1';

export default function WelcomeScreen() {
  const router = useRouter();

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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-4xl font-extrabold text-indigo-600 mb-3">Slow to Pro</Text>
        <Text className="text-base text-gray-600 text-center mb-10">
          Welcome 👋 Let’s turn consistent daily effort into real progress.
        </Text>

        <TouchableOpacity onPress={handleGetStarted} className="bg-indigo-600 px-6 py-3 rounded-xl">
          <Text className="text-white font-semibold text-base">Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
