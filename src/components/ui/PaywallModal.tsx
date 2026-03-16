import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { useAppTheme } from '@/hooks/useAppTheme';
import {
  getOfferings,
  isRevenueCatConfigured,
  purchasePackage,
  restorePurchases,
} from '@/utils/purchases';

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
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const configured = isRevenueCatConfigured();

  useEffect(() => {
    if (!visible) return;
    setErrorMsg(null);
    setLoading(true);
    getOfferings().then((offering) => {
      const pkgs = offering?.availablePackages ?? [];
      setPackages(pkgs);
      setSelected(pkgs[0] ?? null);
      setLoading(false);
    });
  }, [visible]);

  const handlePurchase = async () => {
    if (!selected) return;
    setBusy(true);
    setErrorMsg(null);
    const { success, error } = await purchasePackage(selected);
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
      setErrorMsg(error ?? 'No previous purchases found for this account.');
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
          {/* Header */}
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

          {/* Packages */}
          {!configured ? (
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
                Add <Text style={{ color: theme.primary }}>EXPO_PUBLIC_REVENUECAT_API_KEY_IOS</Text>{' '}
                and{' '}
                <Text style={{ color: theme.primary }}>EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID</Text>{' '}
                to your .env to enable in-app purchases.
              </Text>
            </View>
          ) : loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginBottom: 16 }} />
          ) : packages.length === 0 ? (
            <Text
              style={{
                fontSize: 13,
                color: theme.textSubtle,
                textAlign: 'center',
                marginBottom: 16,
              }}>
              No offerings available right now.
            </Text>
          ) : (
            <View style={{ gap: 10, marginBottom: 16 }}>
              {packages.map((pkg) => {
                const isSelected = selected?.identifier === pkg.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    onPress={() => setSelected(pkg)}
                    style={{
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <View>
                      <Text
                        style={{
                          fontWeight: '700',
                          fontSize: 15,
                          color: theme.text,
                        }}>
                        {pkg.product.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSubtle, marginTop: 2 }}>
                        {pkg.product.description}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 17, color: theme.primary }}>
                      {pkg.product.priceString}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {errorMsg && (
            <Text
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
            onPress={handlePurchase}
            disabled={!configured || !selected || busy}
            style={{
              backgroundColor: !configured || !selected ? theme.surfaceMuted : theme.primary,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 12,
            }}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {selected ? `Get Pro · ${selected.product.priceString}` : 'Get Pro'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity
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
