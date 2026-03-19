import Ionicons from '@expo/vector-icons/Ionicons';
import * as ExpoLinking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { syncFromCloudOrSeed } from '@/services/cloudSync';
import { loadSpaces } from '@/services/spaceSync';
import { authenticateWithBiometrics, isBiometricAvailable } from '@/utils/biometrics';
import { appStorage } from '@/utils/mmkv';

const TC_ACCEPTED_KEY = 'tc-accepted-v1';
const HAS_SEEN_WELCOME_KEY = 'has-seen-welcome-v1';
const BIOMETRIC_ENABLED_KEY = 'biometric-login-enabled-v1';

type BusyAction = 'checking' | 'login' | 'signup' | 'google' | 'apple' | 'biometric';

type Theme = ReturnType<typeof useAppTheme>;

function CheckboxRow({
  testID,
  checked,
  onToggle,
  label,
  theme,
}: {
  testID?: string;
  checked: boolean;
  onToggle: () => void;
  label: string;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: checked ? theme.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 14, flex: 1 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tcAccepted, setTcAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>('checking');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const authEnabled = isSupabaseConfigured && !!supabase;
  const isBusy = busyAction !== null;
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (appStorage.getItem(HAS_SEEN_WELCOME_KEY) === 'true') {
        router.replace('/(tabs)/tasks');
        return;
      }

      const hasBiometric = await isBiometricAvailable();
      if (!cancelled) setBiometricAvailable(hasBiometric);

      if (authEnabled) {
        const { data } = await supabase!.auth.getUser();
        if (cancelled) return;
        if (data?.user) {
          if (hasBiometric && appStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true') {
            setBusyAction(null);
            setTimeout(() => triggerBiometricLogin(), 200);
          } else {
            router.replace('/(tabs)/tasks');
          }
          return;
        }
      } else {
        if (appStorage.getItem(TC_ACCEPTED_KEY) === 'true') {
          router.replace('/(tabs)/tasks');
          return;
        }
      }

      if (!cancelled) setBusyAction(null);
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    if (showRegister || !authEnabled) {
      if (!privacyAccepted || !tcAccepted) return false;
    }
    if (!authEnabled) return true;
    return email.trim().length > 0 && password.length >= 6;
  }, [authEnabled, email, showRegister, password, privacyAccepted, tcAccepted]);

  const withBusy = async <T,>(action: BusyAction, fn: () => Promise<T>): Promise<T | null> => {
    try {
      setBusyAction(action);
      setStatusMessage(null);
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setStatusMessage(message);
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogin = async () => {
    if (!supabase || !canSubmit) return;
    await withBusy('login', async () => {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned from login.');
      await syncFromCloudOrSeed(data.user.id);
      void loadSpaces();
      appStorage.setItem(TC_ACCEPTED_KEY, 'true');
      router.replace('/(tabs)/tasks');
    });
  };

  const handleSignUp = async () => {
    if (!supabase || !canSubmit) return;
    await withBusy('signup', async () => {
      const { data, error } = await supabase!.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (data.user) {
        await syncFromCloudOrSeed(data.user.id);
        void loadSpaces();
      }
      appStorage.setItem(TC_ACCEPTED_KEY, 'true');
      router.replace('/(tabs)/tasks');
    });
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (!supabase || isBusy) return;
    await withBusy(provider, async () => {
      const redirectTo = ExpoLinking.createURL('auth/callback');
      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Unable to start OAuth flow.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !('url' in result)) return;

      const parsed = ExpoLinking.parse(result.url);
      const code =
        typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : undefined;
      if (!code) return;

      const { data: exchangeData, error: exchangeError } =
        await supabase!.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;

      if (exchangeData?.user) {
        await syncFromCloudOrSeed(exchangeData.user.id);
        void loadSpaces();
        appStorage.setItem(TC_ACCEPTED_KEY, 'true');
        router.replace('/(tabs)/tasks');
      }
    });
  };

  const triggerBiometricLogin = async () => {
    if (isBusy) return;
    await withBusy('biometric', async () => {
      const success = await authenticateWithBiometrics('Sign in to Slow to Pro');
      if (success) {
        appStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        router.replace('/(tabs)/tasks');
      } else {
        setStatusMessage('Biometric authentication failed or was cancelled.');
      }
    });
  };

  const handleContinueWithoutAccount = () => {
    if (!privacyAccepted || !tcAccepted) return;
    appStorage.setItem(TC_ACCEPTED_KEY, 'true');
    router.replace('/(tabs)/tasks');
  };

  if (busyAction === 'checking') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator testID="auth-loading" color={theme.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 40 }}>
          <Text style={{ fontSize: 34, fontWeight: 'bold', color: theme.text }}>Slow to Pro</Text>
          <Text style={{ fontSize: 15, color: theme.textMuted, marginTop: 8 }}>
            {showRegister ? 'Create your account' : 'Sign in to your account'}
          </Text>
        </View>

        {/* Face ID / Biometric button */}
        {biometricAvailable && !showRegister && (
          <TouchableOpacity
            testID="biometric-login-button"
            onPress={triggerBiometricLogin}
            disabled={isBusy}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: theme.surface,
              borderColor: theme.primary,
              borderWidth: 1.5,
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
              opacity: isBusy ? 0.65 : 1,
            }}>
            {busyAction === 'biometric' ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <>
                <Ionicons name="scan-outline" size={20} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 15 }}>
                  Sign in with Face ID
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Email / Password fields */}
        {authEnabled && (
          <>
            <TextInput
              testID="auth-email-input"
              placeholder="Email"
              placeholderTextColor={theme.textSubtle}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: theme.text,
                marginBottom: 12,
              }}
            />
            <TextInput
              testID="auth-password-input"
              ref={passwordRef}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={theme.textSubtle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={showRegister ? handleSignUp : handleLogin}
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: theme.text,
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* T&C / Privacy checkboxes */}
        {(showRegister || !authEnabled) && (
          <>
            <CheckboxRow
              testID="privacy-checkbox"
              checked={privacyAccepted}
              onToggle={() => setPrivacyAccepted((v) => !v)}
              label="I have read and accept the Privacy Policy"
              theme={theme}
            />
            <CheckboxRow
              testID="tc-checkbox"
              checked={tcAccepted}
              onToggle={() => setTcAccepted((v) => !v)}
              label="I agree to the Terms & Conditions"
              theme={theme}
            />
          </>
        )}

        {/* Status / error message */}
        {statusMessage != null && (
          <Text
            testID="auth-status-message"
            style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            {statusMessage}
          </Text>
        )}

        {authEnabled ? (
          <>
            {/* Primary login / signup button */}
            <TouchableOpacity
              testID={showRegister ? 'signup-button' : 'login-button'}
              onPress={showRegister ? handleSignUp : handleLogin}
              disabled={showRegister ? !canSubmit || isBusy : isBusy}
              style={{
                backgroundColor:
                  (showRegister ? canSubmit : true) && !isBusy ? theme.primary : theme.border,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 12,
              }}>
              {busyAction === 'login' || busyAction === 'signup' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                  {showRegister ? 'Create Account' : 'Log In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text style={{ color: theme.textSubtle, paddingHorizontal: 12, fontSize: 13 }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>

            {/* Google */}
            <TouchableOpacity
              testID="google-login-button"
              onPress={() => handleSocialLogin('google')}
              disabled={isBusy}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                opacity: isBusy ? 0.65 : 1,
              }}>
              {busyAction === 'google' ? (
                <ActivityIndicator color={theme.textMuted} size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#DB4437" />
                  <Text style={{ color: theme.textMuted, fontWeight: '600', fontSize: 15 }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple */}
            <TouchableOpacity
              testID="apple-login-button"
              onPress={() => handleSocialLogin('apple')}
              disabled={isBusy}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                opacity: isBusy ? 0.65 : 1,
              }}>
              {busyAction === 'apple' ? (
                <ActivityIndicator color={theme.textMuted} size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={18} color={theme.text} />
                  <Text style={{ color: theme.textMuted, fontWeight: '600', fontSize: 15 }}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Toggle login <-> register */}
            <TouchableOpacity
              testID="toggle-auth-mode"
              onPress={() => {
                setShowRegister((v) => !v);
                setStatusMessage(null);
              }}
              style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: theme.primary, fontSize: 14 }}>
                {showRegister
                  ? 'Already have an account? Log In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>

            {/* Continue without account */}
            <TouchableOpacity
              testID="continue-without-account"
              onPress={handleContinueWithoutAccount}
              disabled={!privacyAccepted || !tcAccepted}
              style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Continue without account</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* No Supabase -- gated "Get Started" */
          <TouchableOpacity
            testID="get-started-button"
            onPress={handleContinueWithoutAccount}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? theme.primary : theme.border,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginTop: 8,
            }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Get Started</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
