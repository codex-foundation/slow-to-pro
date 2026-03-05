import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="bg-white rounded-t-2xl px-6 pt-4 pb-8">
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
