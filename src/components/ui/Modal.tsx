import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const theme = useAppTheme();

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1"
        style={{ backgroundColor: theme.overlay }}
        activeOpacity={1}
        onPress={onClose}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          className="rounded-t-2xl px-6 pt-4 pb-8"
          style={{
            backgroundColor: theme.surfaceElevated,
            borderTopColor: theme.border,
            borderTopWidth: 1,
          }}>
          <View
            className="w-10 h-1 rounded-full self-center mb-4"
            style={{ backgroundColor: theme.border }}
          />
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold" style={{ color: theme.text }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Text className="text-lg" style={{ color: theme.textSubtle }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
