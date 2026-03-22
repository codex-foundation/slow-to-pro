import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthScreen } from '@/hooks/useAuthScreen';

export default function AuthScreen() {
  const theme = useAppTheme();
  const {
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
  } = useAuthScreen();

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
              onPress={toggleAuthMode}
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
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                Continue without account
              </Text>
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
