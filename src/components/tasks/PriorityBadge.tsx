import { View } from 'react-native';
import type { Priority } from '@/models/task';

const colorMap: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-green-500',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <View className={`w-2.5 h-2.5 rounded-full ${colorMap[priority]}`} />;
}
