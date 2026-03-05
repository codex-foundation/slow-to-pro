import { FlatList, Text, View } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { formatShortDate, formatTime } from '@/utils/date';

export function SessionLog() {
  const sessions = usePomodoroStore((s) => s.sessions);

  if (sessions.length === 0) {
    return <Text className="text-gray-400 text-sm text-center py-4">No sessions yet</Text>;
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View className="flex-row items-center py-2.5 border-b border-gray-50">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${item.phase === 'work' ? 'bg-indigo-100' : 'bg-green-100'}`}>
            <Text className="text-sm">{item.phase === 'work' ? '🎯' : '☕'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-700 font-medium" numberOfLines={1}>
              {item.taskTitle ?? '—'}
            </Text>
            <Text className="text-xs text-gray-400">
              {formatShortDate(item.startedAt)} · {formatTime(item.startedAt)} ·{' '}
              {item.durationMinutes}min
            </Text>
          </View>
          <View
            className={`px-2 py-0.5 rounded-full ${item.phase === 'work' ? 'bg-indigo-50' : 'bg-green-50'}`}>
            <Text
              className={`text-xs font-medium ${item.phase === 'work' ? 'text-indigo-600' : 'text-green-600'}`}>
              {item.phase === 'work' ? 'Focus' : 'Break'}
            </Text>
          </View>
        </View>
      )}
    />
  );
}
