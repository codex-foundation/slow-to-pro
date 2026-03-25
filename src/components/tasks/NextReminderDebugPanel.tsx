import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Task } from '@/models/task';
import {
  type BrowserNotificationPermission,
  type BrowserNotificationTestResult,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserTestNotification,
} from '@/utils/browserNotifications';

interface NextReminderDebugPanelProps {
  tasks: Task[];
}

function detectBrowserFamily(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari';
  return 'other';
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function NextReminderDebugPanel({ tasks }: NextReminderDebugPanelProps) {
  const [now, setNow] = useState(Date.now());
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    getBrowserNotificationPermission()
  );
  const [lastTestResult, setLastTestResult] = useState<BrowserNotificationTestResult | null>(null);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      setPermission(getBrowserNotificationPermission());
    }, 1000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  const nextReminderTask = useMemo(() => {
    return tasks
      .filter((task) => typeof task.reminderAt === 'number' && task.reminderAt > now)
      .sort((a, b) => (a.reminderAt ?? 0) - (b.reminderAt ?? 0))[0];
  }, [tasks, now]);

  const permissionTone =
    permission === 'granted'
      ? 'text-emerald-700'
      : permission === 'denied'
        ? 'text-rose-700'
        : 'text-amber-700';

  const shouldShowTroubleshooting =
    permission === 'denied' ||
    lastTestResult === 'failed' ||
    lastTestResult === 'permission-missing' ||
    lastTestResult === 'shown';

  const browserFamily = detectBrowserFamily();

  const browserSpecificTip =
    browserFamily === 'chrome'
      ? 'Chrome: Click the lock icon in the address bar → Site settings → Notifications → Allow.'
      : browserFamily === 'safari'
        ? 'Safari: Safari Settings → Websites → Notifications, then allow this site.'
        : browserFamily === 'firefox'
          ? 'Firefox: Click the permissions icon in the address bar → Allow notifications.'
          : browserFamily === 'edge'
            ? 'Edge: Lock icon in address bar → Permissions for this site → Notifications: Allow.'
            : 'Check this site permissions in your browser and set Notifications to Allow.';

  if (!nextReminderTask || !nextReminderTask.reminderAt) {
    return (
      <View className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-amber-700">Debug</Text>
        <Text className={`mt-1 text-sm font-semibold ${permissionTone}`}>
          Browser permission: {permission}
        </Text>
        <View className="mt-2 flex-row gap-2">
          <Pressable
            onPress={async () => {
              const next = await requestBrowserNotificationPermission();
              setPermission(next);
            }}
            className="rounded-lg bg-indigo-600 px-3 py-2">
            <Text className="text-xs font-semibold text-white">Enable browser notifications</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              const result = await showBrowserTestNotification();
              setLastTestResult(result);
            }}
            className="rounded-lg bg-gray-200 px-3 py-2">
            <Text className="text-xs font-semibold text-gray-800">Send test</Text>
          </Pressable>
        </View>
        {lastTestResult ? (
          <Text className="mt-2 text-xs text-amber-900">Last test result: {lastTestResult}</Text>
        ) : null}
        {shouldShowTroubleshooting ? (
          <View className="mt-2 rounded-lg border border-amber-300 bg-amber-100 p-2">
            <Text className="text-xs font-semibold text-amber-900">Troubleshooting</Text>
            <Text className="mt-1 text-xs text-amber-900">• {browserSpecificTip}</Text>
            <Text className="mt-1 text-xs text-amber-900">
              • If status is "shown" but no popup appears, disable Focus/Do Not Disturb on macOS.
            </Text>
            <Text className="mt-1 text-xs text-amber-900">
              • Ensure system notifications are enabled for your browser in macOS System Settings.
            </Text>
          </View>
        ) : null}
        <Text className="mt-1 text-sm text-amber-800">No upcoming reminders found.</Text>
      </View>
    );
  }

  const msLeft = nextReminderTask.reminderAt - now;

  return (
    <View className="mx-4 mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Debug</Text>
      <Text className={`mt-1 text-sm font-semibold ${permissionTone}`}>
        Browser permission: {permission}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={async () => {
            const next = await requestBrowserNotificationPermission();
            setPermission(next);
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2">
          <Text className="text-xs font-semibold text-white">Enable browser notifications</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            const result = await showBrowserTestNotification();
            setLastTestResult(result);
          }}
          className="rounded-lg bg-gray-200 px-3 py-2">
          <Text className="text-xs font-semibold text-gray-800">Send test</Text>
        </Pressable>
      </View>
      {lastTestResult ? (
        <Text className="mt-2 text-xs text-indigo-900">Last test result: {lastTestResult}</Text>
      ) : null}
      {shouldShowTroubleshooting ? (
        <View className="mt-2 rounded-lg border border-indigo-300 bg-indigo-100 p-2">
          <Text className="text-xs font-semibold text-indigo-900">Troubleshooting</Text>
          <Text className="mt-1 text-xs text-indigo-900">• {browserSpecificTip}</Text>
          <Text className="mt-1 text-xs text-indigo-900">
            • If status is "shown" but no popup appears, disable Focus/Do Not Disturb on macOS.
          </Text>
          <Text className="mt-1 text-xs text-indigo-900">
            • Ensure system notifications are enabled for your browser in macOS System Settings.
          </Text>
        </View>
      ) : null}
      <Text className="mt-1 text-sm font-semibold text-indigo-900">
        Next reminder: {nextReminderTask.title}
      </Text>
      <Text className="mt-1 text-sm text-indigo-900">
        Fires in {formatMs(msLeft)} ({new Date(nextReminderTask.reminderAt).toLocaleString()})
      </Text>
    </View>
  );
}
