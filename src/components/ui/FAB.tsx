import { Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface FABProps {
  onPress: () => void;
  label?: string;
}

export function FAB({ onPress, label = '+' }: FABProps) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      style={{ backgroundColor: theme.primary }}
      activeOpacity={0.8}>
      <Text className="text-white text-3xl font-light leading-none">{label}</Text>
    </TouchableOpacity>
  );
}
