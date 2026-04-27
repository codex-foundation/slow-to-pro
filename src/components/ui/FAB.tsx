import { Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface FABProps {
  onPress: () => void;
  label?: string;
  bottomOffset?: number;
  align?: 'center' | 'right';
}

export function FAB({ onPress, label = '+', bottomOffset = 16, align = 'center' }: FABProps) {
  const theme = useAppTheme();

  const positionStyle =
    align === 'right' ? { right: 20 } : { left: '50%' as const, transform: [{ translateX: -28 }] };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center justify-center shadow-lg"
      accessibilityRole="button"
      accessibilityLabel="Add task"
      accessibilityHint="Opens the new task form"
      style={{
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.primary,
        bottom: bottomOffset,
        zIndex: 30,
        elevation: 30,
        ...positionStyle,
      }}
      activeOpacity={0.8}>
      <Text className="text-white text-3xl font-light leading-none">{label}</Text>
    </TouchableOpacity>
  );
}
