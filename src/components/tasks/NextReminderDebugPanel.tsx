import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import type { Task } from '@/models/task';

interface NextReminderDebugPanelProps {
  tasks: Task[];
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function NextReminderDebugPanel({ tasks }: NextReminderDebugPanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  const nextReminderTask = useMemo(() => {
    return tasks
      .filter((task) => typeof task.reminderAt === 'number' && task.reminderAt > now)
      .sort((a, b) => (a.reminderAt ?? 0) - (b.reminderAt ?? 0))[0];
  }, [tasks, now]);

  if (!nextReminderTask || !nextReminderTask.reminderAt) {
    return (
      <View className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-amber-700">Debug</Text>
        <Text className="mt-1 text-sm text-amber-800">No upcoming reminders found.</Text>
      </View>
    );
  }

  const msLeft = nextReminderTask.reminderAt - now;

  return (
    <View className="mx-4 mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Debug</Text>
      <Text className="mt-1 text-sm font-semibold text-indigo-900">
        Next reminder: {nextReminderTask.title}
      </Text>
      <Text className="mt-1 text-sm text-indigo-900">
        Fires in {formatMs(msLeft)} ({new Date(nextReminderTask.reminderAt).toLocaleString()})
      </Text>
    </View>
  );
}
