import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { SharedSpaceModal } from '@/components/ui/SharedSpaceModal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { syncFromCloudOrSeed } from '@/services/cloudSync';
import { loadSpaces } from '@/services/spaceSync';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { type ThemePreference, useSettingsStore } from '@/stores/settingsStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useSyncStore } from '@/stores/syncStore';
import { refreshProStatus } from '@/utils/purchases';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

function syncTimeAgo(ms: number): string {
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function SettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { pro } = useLocalSearchParams<{ pro?: string }>();

  // On web: refresh pro status when returning from Stripe Checkout
  useEffect(() => {
    if (Platform.OS === 'web' && pro === 'success') {
      void refreshProStatus();
    }
  }, [pro]);
  const { lastSyncedAt, isSyncing, syncError } = useSyncStore();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    'login' | 'signup' | 'google' | 'apple' | 'logout' | null
  >(null);
  const isPro = useEntitlementStore((s) => s.isPro);
  const isRcPro = useEntitlementStore((s) => s.isRcPro);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSpaces, setShowSpaces] = useState(false);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const spaces = useSpaceStore((s) => s.spaces);
  const pendingInvites = useSpaceStore((s) => s.pendingInvites);

  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserEmail(data.user?.email ?? null);
      setAuthLoading(false);
    });

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserEmail(session?.user?.email ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const authEnabled = isSupabaseConfigured && !!supabase;
  const isBusy = busyAction !== null;
  const canAuthSubmit = useMemo(
    () => authEnabled && email.trim().length > 0 && password.length >= 6 && !isBusy,
    [authEnabled, email, password, isBusy]
  );

  const withBusy = async (
    action: NonNullable<typeof busyAction>,
    fn: () => Promise<void>
  ): Promise<void> => {
    try {
      setBusyAction(action);
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogin = async () => {
    if (!supabase || !canAuthSubmit) return;
    await withBusy('login', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned from login.');

      const result = await syncFromCloudOrSeed(data.user.id);
      void loadSpaces();
      setStatusMessage(
        result === 'pulled'
          ? 'Logged in and synced your latest cloud data.'
          : 'Logged in and created your first cloud backup.'
      );
    });
  };

  const handleSignUp = async () => {
    if (!supabase || !canAuthSubmit) return;
    await withBusy('signup', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      if (data.user) {
        await syncFromCloudOrSeed(data.user.id);
        void loadSpaces();
      }

      setStatusMessage('Account created. Check email to confirm if prompted, then log in.');
    });
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await withBusy('logout', async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/');
    });
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (!supabase || isBusy) return;

    const action = provider === 'google' ? 'google' : 'apple';

    await withBusy(action, async () => {
      const redirectTo = ExpoLinking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Unable to start OAuth flow.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success' || !('url' in result)) {
        return;
      }

      const callbackUrl = result.url;
      const parsed = ExpoLinking.parse(callbackUrl);
      const code =
        typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : undefined;

      if (!code) {
        return;
      }

      const { data: exchangeData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;

      if (exchangeData.user) {
        const syncResult = await syncFromCloudOrSeed(exchangeData.user.id);
        void loadSpaces();
        setStatusMessage(
          syncResult === 'pulled'
            ? 'Logged in and synced your latest cloud data.'
            : 'Logged in and created your first cloud backup.'
        );
      }
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Settings
          </Text>
        </View>

        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              borderWidth: 1,
            }}>
            <Text className="text-sm font-semibold" style={{ color: theme.textMuted }}>
              Theme
            </Text>
            <Text className="text-xs mt-1 mb-3" style={{ color: theme.textSubtle }}>
              Choose your preferred appearance.
            </Text>

            <View className="flex-row gap-2">
              {THEME_OPTIONS.map((option) => {
                const active = themePreference === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setThemePreference(option)}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: active ? theme.primary : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                      borderWidth: 1,
                    }}>
                    <Text
                      className="text-sm font-medium capitalize"
                      style={{ color: active ? '#fff' : theme.textMuted }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              borderWidth: 1,
            }}>
            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>
              Account & Sync
            </Text>
            {!authEnabled ? (
              <Text className="text-xs" style={{ color: theme.textSubtle }}>
                Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to
                enable login and cross-device sync.
              </Text>
            ) : (
              <>
                {authLoading ? (
                  <ActivityIndicator size="small" color={theme.textSubtle} />
                ) : (
                  <>
                    <Text className="text-xs mb-3" style={{ color: theme.textSubtle }}>
                      {userEmail
                        ? `Logged in as ${userEmail}`
                        : 'Log in or sign up to sync your tasks, finances, focus sessions, and settings across devices.'}
                    </Text>

                    {!authLoading && !userEmail && (
                      <>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          placeholder="Email"
                          placeholderTextColor={theme.textSubtle}
                          className="rounded-xl px-4 py-3 text-sm mb-2"
                          style={{
                            borderColor: theme.border,
                            borderWidth: 1,
                            backgroundColor: theme.surface,
                            color: theme.text,
                          }}
                        />
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry
                          placeholder="Password (min 6 chars)"
                          placeholderTextColor={theme.textSubtle}
                          className="rounded-xl px-4 py-3 text-sm mb-3"
                          style={{
                            borderColor: theme.border,
                            borderWidth: 1,
                            backgroundColor: theme.surface,
                            color: theme.text,
                          }}
                        />

                        <View className="flex-row gap-2 mb-2">
                          <TouchableOpacity
                            onPress={handleLogin}
                            disabled={!canAuthSubmit}
                            className="flex-1 py-2.5 rounded-xl items-center"
                            style={{
                              backgroundColor: canAuthSubmit ? theme.primary : theme.surface,
                              borderColor: theme.border,
                              borderWidth: canAuthSubmit ? 0 : 1,
                            }}>
                            <Text
                              className="font-semibold"
                              style={{ color: canAuthSubmit ? '#fff' : theme.textSubtle }}>
                              {busyAction === 'login' ? 'Logging in...' : 'Log in'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleSignUp}
                            disabled={!canAuthSubmit}
                            className="flex-1 py-2.5 rounded-xl items-center"
                            style={{
                              backgroundColor: canAuthSubmit ? theme.surface : theme.surfaceMuted,
                              borderColor: theme.border,
                              borderWidth: 1,
                            }}>
                            <Text className="font-semibold" style={{ color: theme.textMuted }}>
                              {busyAction === 'signup' ? 'Signing up...' : 'Sign up'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View className="gap-2 mb-2">
                          <TouchableOpacity
                            onPress={() => handleSocialLogin('google')}
                            disabled={isBusy}
                            className="py-2.5 rounded-xl items-center"
                            style={{
                              backgroundColor: theme.surface,
                              borderColor: theme.border,
                              borderWidth: 1,
                              opacity: isBusy ? 0.65 : 1,
                            }}>
                            <Text className="font-semibold" style={{ color: theme.textMuted }}>
                              {busyAction === 'google'
                                ? 'Opening Google...'
                                : 'Continue with Google'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleSocialLogin('apple')}
                            disabled={isBusy}
                            className="py-2.5 rounded-xl items-center"
                            style={{
                              backgroundColor: theme.surface,
                              borderColor: theme.border,
                              borderWidth: 1,
                              opacity: isBusy ? 0.65 : 1,
                            }}>
                            <Text className="font-semibold" style={{ color: theme.textMuted }}>
                              {busyAction === 'apple' ? 'Opening Apple...' : 'Continue with Apple'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {userEmail && (
                      <>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12,
                          }}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: isSyncing
                                ? theme.primary
                                : syncError
                                  ? '#ef4444'
                                  : lastSyncedAt
                                    ? '#22c55e'
                                    : '#94a3b8',
                            }}
                          />
                          <Text style={{ fontSize: 12, color: theme.textSubtle }}>
                            {isSyncing
                              ? 'Syncing…'
                              : syncError
                                ? `Sync error: ${syncError}`
                                : lastSyncedAt
                                  ? `Synced · ${syncTimeAgo(lastSyncedAt)}`
                                  : 'Sync pending…'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={handleLogout}
                          disabled={isBusy}
                          className="py-2.5 rounded-xl items-center"
                          style={{
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            borderWidth: 1,
                          }}>
                          <Text className="font-semibold" style={{ color: theme.textMuted }}>
                            {busyAction === 'logout' ? 'Logging out…' : 'Log out'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {!!statusMessage && (
                      <Text className="text-xs mt-3" style={{ color: theme.textSubtle }}>
                        {statusMessage}
                      </Text>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </View>

        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              borderWidth: 1,
            }}>
            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>
              Pro
            </Text>
            {isPro ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                    ✓ You're on Pro
                  </Text>
                </View>
                {isRcPro && (
                  <TouchableOpacity
                    onPress={() =>
                      void ExpoLinking.openURL(
                        Platform.OS === 'android'
                          ? 'https://play.google.com/store/account/subscriptions'
                          : 'itms-apps://apps.apple.com/account/subscriptions'
                      )
                    }
                    className="py-2.5 rounded-xl items-center"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      borderWidth: 1,
                    }}>
                    <Text className="font-semibold" style={{ color: theme.textMuted }}>
                      Manage Subscription
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <Text className="text-xs mb-3" style={{ color: theme.textSubtle }}>
                  Unlock recurring tasks, reminders, unlimited categories, and more.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPaywall(true)}
                  className="py-2.5 rounded-xl items-center"
                  style={{ backgroundColor: theme.primary }}>
                  <Text className="font-semibold text-white">Upgrade to Pro</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Shared Spaces */}
        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              borderWidth: 1,
            }}>
            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>
              Shared Spaces
            </Text>
            {!isPro ? (
              <>
                <Text className="text-xs mb-3" style={{ color: theme.textSubtle }}>
                  Share tasks and budgets with family or team. Pro feature.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPaywall(true)}
                  className="py-2.5 rounded-xl items-center"
                  style={{ backgroundColor: theme.primary }}>
                  <Text className="font-semibold text-white">Upgrade to Pro</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  className="text-xs mb-2"
                  style={{ color: activeSpaceId ? theme.primary : theme.textSubtle }}>
                  {activeSpaceId
                    ? `Space: ${spaces.find((s) => s.id === activeSpaceId)?.name ?? 'Unknown'}`
                    : 'Personal (no space selected)'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSpaces(true)}
                  className="py-2.5 rounded-xl items-center flex-row justify-center gap-2"
                  style={{ backgroundColor: theme.primary }}>
                  <Text className="font-semibold text-white">Manage Spaces</Text>
                  {pendingInvites.length > 0 && (
                    <View
                      style={{
                        backgroundColor: '#ef4444',
                        borderRadius: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                      }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        {pendingInvites.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View className="px-4 mt-4">
          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              borderWidth: 1,
            }}>
            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textMuted }}>
              About
            </Text>

            <View className="flex-row justify-between py-1">
              <Text className="text-sm" style={{ color: theme.textSubtle }}>
                App Version
              </Text>
              <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                {appVersion}
              </Text>
            </View>

            <View className="h-px my-2" style={{ backgroundColor: theme.border }} />

            <Text className="text-sm" style={{ color: theme.textSubtle }}>
              © {currentYear} slow-to-pro. All rights reserved.
            </Text>
          </View>
        </View>
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onUpgraded={() => setShowPaywall(false)}
        />
        <SharedSpaceModal visible={showSpaces} onClose={() => setShowSpaces(false)} />
      </ScrollView>
    </SafeAreaView>
  );
}
