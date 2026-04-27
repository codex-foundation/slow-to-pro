import { View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Props {
  size?: number;
  top?: number;
  right?: number;
  left?: number;
  opacity?: number;
}

export function Halo({ size = 320, top = -80, right, left, opacity = 0.18 }: Props) {
  const theme = useAppTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        right,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.primary,
        opacity,
        transform: [{ scale: 1.1 }],
      }}
    />
  );
}
