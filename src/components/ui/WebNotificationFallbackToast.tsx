import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  subscribeWebNotificationFallback,
  type WebNotificationFallbackPayload,
} from '@/utils/webNotificationFallback';

const MAX_TOASTS = 3;
const DISMISS_AFTER_MS = 5000;

export function WebNotificationFallbackToast() {
  const [toasts, setToasts] = useState<WebNotificationFallbackPayload[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const unsubscribe = subscribeWebNotificationFallback((payload) => {
      setToasts((prev) => [payload, ...prev].slice(0, MAX_TOASTS));

      const timeoutId = globalThis.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== payload.id));
      }, DISMISS_AFTER_MS);
      timeoutIdsRef.current.push(timeoutId);
    });

    return () => {
      unsubscribe();
      for (const timeoutId of timeoutIdsRef.current) {
        globalThis.clearTimeout(timeoutId);
      }
      timeoutIdsRef.current = [];
    };
  }, []);

  if (Platform.OS !== 'web' || toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          style={styles.toast}
          onPress={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}>
          <Text style={styles.title}>{toast.title}</Text>
          <Text style={styles.body}>{toast.body}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    right: 12,
    left: 12,
    zIndex: 9999,
    gap: 8,
    alignItems: 'flex-end',
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: {
    color: '#f9fafb',
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: '#d1d5db',
  },
});
