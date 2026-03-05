import { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionLog } from '@/components/pomodoro/SessionLog';
import { TaskPicker } from '@/components/pomodoro/TaskPicker';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { usePomodoroStore } from '@/stores/pomodoroStore';

export default function PomodoroScreen() {
  const status = usePomodoroStore((s) => s.status);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        const remaining = usePomodoroStore.getState().secondsRemaining;
        if (remaining <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          usePomodoroStore.getState().completeCycle();
        } else {
          usePomodoroStore.getState().tick();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">Focus</Text>
        </View>

        <TimerDisplay />

        <View className="px-4 mt-2">
          <TimerControls />
        </View>

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-700 mb-2">Link to task</Text>
          <TaskPicker />
        </View>

        <View className="px-4 mt-6 mb-8">
          <Text className="text-base font-semibold text-gray-700 mb-2">Session log</Text>
          <SessionLog />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
