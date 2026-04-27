import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type } from './tokens';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, right }: Props) {
  const theme = useAppTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? (
            <Text style={[type.eyebrow, { color: theme.textSubtle, marginBottom: 6 }]}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={[type.display, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 15, lineHeight: 21 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
      </View>
    </View>
  );
}
