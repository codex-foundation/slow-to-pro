import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { radii, shadow } from './tokens';

interface Props {
  children: ReactNode;
  padded?: boolean;
  elevated?: boolean;
  style?: ViewStyle;
}

export function Card({ children, padded = true, elevated = false, style }: Props) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: theme.border,
          padding: padded ? 16 : 0,
        },
        elevated && shadow(theme),
        style,
      ]}>
      {children}
    </View>
  );
}
