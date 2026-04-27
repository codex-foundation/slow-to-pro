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
import { Card, Halo, PillGroup, ScreenHeader, SectionLabel } from '@/design';
import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { syncFromCloudOrSeed } from '@/services/cloudSync';
import { loadSpaces } from '@/services/spaceSync';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { type ThemePreference, useSettingsStore } from '@/stores/settingsStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useSyncStore } from '@/stores/syncStore';
import { refreshProStatus } from '@/utils/purchases';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'system' },
  { value: 'light', label: 'light' },
  { value: 'dark', label: 'dark' },
];

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

  const syncDotColor = isSyncing
    ? theme.primary
    : syncError
      ? theme.danger
      : lastSyncedAt
        ? theme.success
        : theme.textSubtle;

  const syncLabel = isSyncing
    ? 'Syncing…'
    : syncError
      ? `Sync error: ${syncError}`
      : lastSyncedAt
        ? `Synced · ${syncTimeAgo(lastSyncedAt)}`
        : 'Sync pending…';

  const inputStyle = {
    borderColor: theme.border,
    borderWidth: 1,
    backgroundColor: theme.bg,
    color: theme.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  } as const;

  const secondaryBtn = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Halo size={380} top={-140} right={-80} opacity={theme.isDark ? 0.14 : 0.1} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Preferences"
          title="Settings"
          subtitle="Theme, account, sync, and Pro — all in one calm place."
        />

        <SectionLabel>Theme</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            <Text style={{ fontSize: 13, color: theme.textSubtle, marginBottom: 12 }}>
              Choose your preferred appearance.
            </Text>
            <PillGroup
              options={THEME_OPTIONS}
              value={themePreference}
              onChange={(v) => setThemePreference(v)}
            />
          </Card>
        </View>

        <SectionLabel>Account & Sync</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            {!authEnabled ? (
              <Text style={{ fontSize: 13, color: theme.textSubtle, lineHeight: 19 }}>
                Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to
                enable login and cross-device sync.
              </Text>
            ) : authLoading ? (
              <ActivityIndicator size="small" color={theme.textSubtle} />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSubtle,
                    lineHeight: 19,
                    marginBottom: 14,
                  }}>
                  {userEmail
                    ? `Logged in as ${userEmail}`
                    : 'Log in or sign up to sync your tasks, finances, focus sessions, and settings across devices.'}
                </Text>

                {!userEmail && (
                  <>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="Email"
                      placeholderTextColor={theme.textSubtle}
                      style={inputStyle}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholder="Password (min 6 chars)"
                      placeholderTextColor={theme.textSubtle}
                      style={inputStyle}
                    />

                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TouchableOpacity
                        onPress={handleLogin}
                        disabled={!canAuthSubmit}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 14,
                          alignItems: 'center',
                          backgroundColor: canAuthSubmit ? theme.primary : theme.surfaceMuted,
                        }}>
                        <Text
                          style={{
                            fontWeight: '600',
                            color: canAuthSubmit ? '#fff' : theme.textSubtle,
                          }}>
                          {busyAction === 'login' ? 'Logging in...' : 'Log in'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSignUp}
                        disabled={!canAuthSubmit}
                        style={{ flex: 1, ...secondaryBtn }}>
                        <Text style={{ fontWeight: '600', color: theme.textMuted }}>
                          {busyAction === 'signup' ? 'Signing up...' : 'Sign up'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleSocialLogin('google')}
                        disabled={isBusy}
                        style={{ ...secondaryBtn, opacity: isBusy ? 0.65 : 1 }}>
                        <Text style={{ fontWeight: '600', color: theme.textMuted }}>
                          {busyAction === 'google' ? 'Opening Google...' : 'Continue with Google'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSocialLogin('apple')}
                        disabled={isBusy}
                        style={{ ...secondaryBtn, opacity: isBusy ? 0.65 : 1 }}>
                        <Text style={{ fontWeight: '600', color: theme.textMuted }}>
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
                        marginBottom: 14,
                      }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: syncDotColor,
                        }}
                      />
                      <Text style={{ fontSize: 12, color: theme.textSubtle }}>{syncLabel}</Text>
                    </View>

                    <TouchableOpacity onPress={handleLogout} disabled={isBusy} style={secondaryBtn}>
                      <Text style={{ fontWeight: '600', color: theme.textMuted }}>
                        {busyAction === 'logout' ? 'Logging out…' : 'Log out'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {!!statusMessage && (
                  <Text style={{ fontSize: 12, color: theme.textSubtle, marginTop: 12 }}>
                    {statusMessage}
                  </Text>
                )}
              </>
            )}
          </Card>
        </View>

        <SectionLabel>Pro</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            {isPro ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.success }}>
                  ✓ You're on Pro
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSubtle,
                    lineHeight: 19,
                    marginBottom: 12,
                  }}>
                  Unlock recurring tasks, reminders, unlimited categories, and more.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPaywall(true)}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: theme.primary,
                  }}>
                  <Text style={{ fontWeight: '600', color: '#fff' }}>Upgrade to Pro</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        <SectionLabel>Shared Spaces</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            {!isPro ? (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSubtle,
                    lineHeight: 19,
                    marginBottom: 12,
                  }}>
                  Share tasks and budgets with family or team. Pro feature.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPaywall(true)}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    backgroundColor: theme.primary,
                  }}>
                  <Text style={{ fontWeight: '600', color: '#fff' }}>Upgrade to Pro</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    marginBottom: 12,
                    color: activeSpaceId ? theme.primary : theme.textSubtle,
                  }}>
                  {activeSpaceId
                    ? `Space: ${spaces.find((s) => s.id === activeSpaceId)?.name ?? 'Unknown'}`
                    : 'Personal (no space selected)'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSpaces(true)}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: theme.primary,
                  }}>
                  <Text style={{ fontWeight: '600', color: '#fff' }}>Manage Spaces</Text>
                  {pendingInvites.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.danger,
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
          </Card>
        </View>

        <SectionLabel>About</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
              <Text style={{ fontSize: 14, color: theme.textSubtle }}>App Version</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                {appVersion}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
            <Text style={{ fontSize: 13, color: theme.textSubtle }}>
              © {currentYear} slow-to-pro. All rights reserved.
            </Text>
          </Card>
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
