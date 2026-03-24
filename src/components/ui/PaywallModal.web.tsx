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
import { createCheckoutSession, isStripeConfigured } from '@/utils/stripe';

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

export function PaywallModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const configured = isStripeConfigured();

  const handlePurchase = async () => {
    setBusy(true);
    setErrorMsg(null);
    const successUrl = `${window.location.origin}/(tabs)/settings?pro=success`;
    const cancelUrl = window.location.href;
    const { url, error } = await createCheckoutSession(successUrl, cancelUrl);
    setBusy(false);
    if (url) {
      window.location.href = url;
    } else {
      setErrorMsg(error ?? 'Failed to start checkout.');
    }
  };

  return (
    <RNModal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/* Backdrop — closes modal on press */}
      <TouchableOpacity
        testID="paywall-backdrop"
        style={{
          flex: 1,
          backgroundColor: theme.overlay,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={onClose}>
        {/* Card — captures touches so they don't reach the backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: theme.surfaceElevated,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 32,
            paddingTop: 32,
            paddingBottom: 32,
            width: '100%',
            maxWidth: 440,
          }}>
          {/* Close button */}
          <TouchableOpacity
            testID="paywall-close"
            onPress={onClose}
            style={{ position: 'absolute', top: 16, right: 16, padding: 4 }}>
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
                  Add{' '}
                  <Text style={{ color: theme.primary }}>EXPO_PUBLIC_STRIPE_PRICE_ID</Text> to your
                  .env to enable web purchases.
                </Text>
              </View>
            )}

            {errorMsg && (
              <Text
                testID="paywall-error"
                style={{ fontSize: 12, color: theme.danger, textAlign: 'center', marginBottom: 12 }}>
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
              }}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Get Pro</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}
