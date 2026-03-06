import { Text, TouchableOpacity, useColorScheme } from 'react-native';
import { getTheme } from '@/utils/theme';

interface FABProps {
  onPress: () => void;
  label?: string;
}

export function FAB({ onPress, label = '+' }: FABProps) {
  const theme = getTheme(useColorScheme());

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
