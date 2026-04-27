import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { isStripeConfigured, purchase, restorePurchases } from '@/utils/purchases';

const PRO_FEATURES = [
  { icon: 'repeat' as const, label: 'Recurring tasks' },
  { icon: 'notifications-outline' as const, label: 'Reminders' },
  { icon: 'cloud-outline' as const, label: 'Cross-device cloud sync' },
  { icon: 'infinite-outline' as const, label: 'Unlimited tasks & categories' },
  { icon: 'timer-outline' as const, label: 'Focus session history' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpgraded: () => void;
}

export function PaywallModal({ visible, onClose, onUpgraded }: Props) {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const configured = isStripeConfigured();

  const handlePurchase = async () => {
    setBusy(true);
    setErrorMsg(null);
    const { success, error } = await purchase();
    setBusy(false);
    if (success) {
      onUpgraded();
      onClose();
    } else if (error) {
      setErrorMsg(error);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setErrorMsg(null);
    const { success, error } = await restorePurchases();
    setRestoring(false);
    if (success) {
      onUpgraded();
      onClose();
    } else {
      setErrorMsg(error ?? 'No active subscription found for this account.');
    }
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: theme.overlay }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: theme.surfaceElevated,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 36,
          maxHeight: '85%',
        }}>
        {/* Drag handle */}
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border,
            alignSelf: 'center',
            marginBottom: 16,
          }}
        />

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', top: 20, right: 20, padding: 4 }}>
          <Ionicons name="close" size={22} color={theme.textSubtle} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: theme.text,
              marginBottom: 4,
              textAlign: 'center',
            }}>
            Upgrade to Pro
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSubtle,
              textAlign: 'center',
              marginBottom: 24,
            }}>
            Unlock everything. One simple upgrade.
          </Text>

          {/* Feature list */}
          <View style={{ gap: 12, marginBottom: 28 }}>
            {PRO_FEATURES.map((f) => (
              <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name={f.icon} size={18} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 15, color: theme.textMuted, flex: 1 }}>{f.label}</Text>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              </View>
            ))}
          </View>

          {/* Stripe not configured */}
          {!configured && (
            <View
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: theme.surfaceMuted,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 16,
              }}>
              <Text style={{ fontSize: 13, color: theme.textSubtle, textAlign: 'center' }}>
                Add <Text style={{ color: theme.primary }}>EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY</Text>{' '}
                and <Text style={{ color: theme.primary }}>EXPO_PUBLIC_STRIPE_PRICE_ID</Text> to
                your .env to enable in-app purchases.
              </Text>
            </View>
          )}

          {errorMsg && (
            <Text
              testID="paywall-error"
              style={{
                fontSize: 12,
                color: theme.danger,
                textAlign: 'center',
                marginBottom: 12,
              }}>
              {errorMsg}
            </Text>
          )}

          {/* CTA */}
          <TouchableOpacity
            testID="paywall-cta"
            onPress={handlePurchase}
            disabled={!configured || busy}
            style={{
              backgroundColor: !configured ? theme.surfaceMuted : theme.primary,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 12,
            }}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Get Pro</Text>
            )}
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity
            testID="paywall-restore"
            onPress={handleRestore}
            disabled={!configured || restoring}
            style={{ alignItems: 'center', paddingVertical: 8 }}>
            {restoring ? (
              <ActivityIndicator size="small" color={theme.textSubtle} />
            ) : (
              <Text style={{ fontSize: 13, color: theme.textSubtle }}>Restore purchases</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </RNModal>
  );
}
