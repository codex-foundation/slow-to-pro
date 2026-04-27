import { Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type } from './tokens';

export function SectionLabel({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 18, marginBottom: 8 }}>
      <Text style={[type.eyebrow, { color: theme.textSubtle }]}>{children}</Text>
    </View>
  );
}
