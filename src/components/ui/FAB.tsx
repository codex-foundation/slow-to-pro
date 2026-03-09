import { Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface FABProps {
  onPress: () => void;
  label?: string;
  bottomOffset?: number;
}

export function FAB({ onPress, label = '+', bottomOffset = 16 }: FABProps) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center justify-center shadow-lg"
      style={{
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.primary,
        bottom: bottomOffset,
        left: '50%',
        transform: [{ translateX: -28 }],
        zIndex: 30,
        elevation: 30,
      }}
      activeOpacity={0.8}>
      <Text className="text-white text-3xl font-light leading-none">{label}</Text>
    </TouchableOpacity>
  );
}
