import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal as RNModal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
    <RNModal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/*
        Backdrop: plain View (no Pressability, no keyboard activation at all).
        TouchableOpacity / Pressable both use RNW's Pressability which fires onPress
        on every keydown Space/Enter that bubbles up from any child — regardless of
        focus. A View renders as a div with zero keyboard handling, so Space inside
        a TextInput cannot accidentally close the modal.
        The web-only `onClick` is the only close trigger (mouse click / tap).
      */}
      <View
        style={{
          flex: 1,
          backgroundColor: theme.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
        accessibilityLabel="Close modal"
        accessibilityHint="Dismisses this modal"
        // @ts-ignore — web-only
        onClick={onClose}
        // @ts-ignore — web-only: keep out of tab order
        tabIndex={-1}>
        {/*
          Card: View (not Pressable) + web onClick stopPropagation so clicks inside
          the card don't bubble to the backdrop and trigger onClose.
          onStartShouldSetResponder claims the RN touch responder to block RN-level
          touch propagation to the backdrop.
        */}
        <View
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: theme.surfaceElevated,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            width: '100%',
            maxWidth: 560,
            maxHeight: '85%',
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 32,
          }}
          // @ts-ignore — web-only: stop click bubbling to backdrop
          onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              accessibilityHint="Dismisses this modal">
              <Ionicons name="close" size={20} color={theme.textSubtle} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </RNModal>
  );
}
