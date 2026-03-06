import { FlatList, Text, View, useColorScheme } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { formatShortDate, formatTime } from '@/utils/date';
import { getTheme } from '@/utils/theme';

export function SessionLog() {
  const theme = getTheme(useColorScheme());
  const sessions = usePomodoroStore((s) => s.sessions);

  if (sessions.length === 0) {
    return (
      <Text className="text-sm text-center py-4" style={{ color: theme.textSubtle }}>
        No sessions yet
      </Text>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View
          className="flex-row items-center py-2.5 border-b"
          style={{ borderBottomColor: theme.border }}>
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-3"
            style={{
              backgroundColor: item.phase === 'work' ? theme.primarySoft : `${theme.success}22`,
            }}>
            <Text className="text-sm">{item.phase === 'work' ? '🎯' : '☕'}</Text>
          </View>
          <View className="flex-1">
            <Text
              className="text-sm font-medium"
              style={{ color: theme.textMuted }}
              numberOfLines={1}>
              {item.taskTitle ?? '—'}
            </Text>
            <Text className="text-xs" style={{ color: theme.textSubtle }}>
              {formatShortDate(item.startedAt)} · {formatTime(item.startedAt)} ·{' '}
              {item.durationMinutes}min
            </Text>
          </View>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: item.phase === 'work' ? theme.primarySoft : `${theme.success}22`,
            }}>
            <Text
              className="text-xs font-medium"
              style={{ color: item.phase === 'work' ? theme.primary : theme.success }}>
              {item.phase === 'work' ? 'Focus' : 'Break'}
            </Text>
          </View>
        </View>
      )}
    />
  );
}
