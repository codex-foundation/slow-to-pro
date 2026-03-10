import {
  Keyboard,
  KeyboardEvent,
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const theme = useAppTheme();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const onShow = (_event: KeyboardEvent) => setKeyboardVisible(true);
    const onHide = (_event: KeyboardEvent) => setKeyboardVisible(false);

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleBackdropPress = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1"
        style={{ backgroundColor: theme.overlay }}
        activeOpacity={1}
        onPress={handleBackdropPress}
        accessibilityRole="button"
        accessibilityLabel="Close modal"
        accessibilityHint="Dismisses this modal"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
              <TouchableOpacity
                onPress={onClose}
                className="p-1"
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                accessibilityHint="Dismisses this modal">
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
