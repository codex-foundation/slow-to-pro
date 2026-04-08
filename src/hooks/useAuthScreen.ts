import * as ExpoLinking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { syncFromCloudOrSeed } from '@/services/cloudSync';
import { loadSpaces } from '@/services/spaceSync';
import { authenticateWithBiometrics, isBiometricAvailable } from '@/utils/biometrics';
import { appStorage } from '@/utils/mmkv';

const TC_ACCEPTED_KEY = 'tc-accepted-v1';
const HAS_SEEN_WELCOME_KEY = 'has-seen-welcome-v1';
const BIOMETRIC_ENABLED_KEY = 'biometric-login-enabled-v1';

export type BusyAction = 'checking' | 'login' | 'signup' | 'google' | 'apple' | 'biometric';

export function useAuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tcAccepted, setTcAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>('checking');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const authEnabled = isSupabaseConfigured && !!supabase;
  const isBusy = busyAction !== null;

  const triggerBiometricLogin = async () => {
    if (isBusy) return;
    try {
      setBusyAction('biometric');
      setStatusMessage(null);
      const success = await authenticateWithBiometrics('Sign in to Slow to Pro');
      if (success) {
        appStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        router.replace('/(tabs)/tasks');
      } else {
        setStatusMessage('Biometric authentication failed or was cancelled.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
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
  }, []);

  const canSubmit = useMemo(() => {
    if (showRegister || !authEnabled) {
      if (!privacyAccepted || !tcAccepted) return false;
    }
    if (!authEnabled) return true;
    return email.trim().length > 0 && password.length >= 6;
  }, [authEnabled, email, showRegister, password, privacyAccepted, tcAccepted]);

  const withBusy = async <T>(action: BusyAction, fn: () => Promise<T>): Promise<T | null> => {
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

  const handleContinueWithoutAccount = () => {
    if (!privacyAccepted || !tcAccepted) return;
    appStorage.setItem(TC_ACCEPTED_KEY, 'true');
    router.replace('/(tabs)/tasks');
  };

  const toggleAuthMode = () => {
    setShowRegister((v) => !v);
    setStatusMessage(null);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    tcAccepted,
    setTcAccepted,
    privacyAccepted,
    setPrivacyAccepted,
    showRegister,
    statusMessage,
    busyAction,
    biometricAvailable,
    canSubmit,
    isBusy,
    authEnabled,
    passwordRef,
    handleLogin,
    handleSignUp,
    handleSocialLogin,
    triggerBiometricLogin,
    handleContinueWithoutAccount,
    toggleAuthMode,
  };
}
